import { createRouterCaller } from "app/_trpc/context";
import { _generateMetadata } from "app/_utils";
import { unstable_cache } from "next/cache";

import { AttributeRepository } from "@calcom/lib/server/repository/attribute";
import { MembershipRole } from "@calcom/prisma/enums";
import { viewerOrganizationsRouter } from "@calcom/trpc/server/routers/viewer/organizations/_router";

import { MembersView } from "~/members/members-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("organization_members"),
    (t) => t("organization_description"),
    undefined,
    undefined,
    "/settings/organizations/members"
  );

const getCachedAttributes = unstable_cache(
  async (orgId: number) => {
    return await AttributeRepository.findAllByOrgIdWithOptions({ orgId });
  },
  undefined,
  { revalidate: 3600, tags: ["viewer.attributes.list"] } // Cache for 1 hour
);

const Page = async () => {
  const orgCaller = await createRouterCaller(viewerOrganizationsRouter);
  const [org, teams] = await Promise.all([orgCaller.listCurrent(), orgCaller.getTeams()]);
  const attributes = await getCachedAttributes(org.id);
  const facetedTeamValues = {
    roles: [MembershipRole.OWNER, MembershipRole.ADMIN, MembershipRole.MEMBER],
    teams,
    attributes: attributes.map((attribute) => ({
      id: attribute.id,
      name: attribute.name,
      options: Array.from(new Set(attribute.options.map((option) => option.value))).map((value) => ({
        value,
      })),
    })),
  };

  return (
    <MembersView org={org} teams={teams} facetedTeamValues={facetedTeamValues} attributes={attributes} />
  );
};

export default Page;
