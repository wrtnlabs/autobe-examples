import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModeratorInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModeratorInvitation";

/**
 * Validate that an admin can retrieve full details of a specific moderator
 * invitation in a community, ensuring access control and completeness of audit
 * information.
 *
 * Steps:
 *
 * 1. Register Admin A
 * 2. Register Admin B (extended role test)
 * 3. Admin A creates a community
 * 4. Admin A issues a moderator invitation (simulate invitation record)
 * 5. Admin fetches the moderator invitation's details for audit/governance
 */
export async function test_api_moderator_invitation_details_by_admin(
  connection: api.IConnection,
) {
  // 1. Register Admin A
  const adminAEmail = RandomGenerator.alphaNumeric(12) + "@admin.com";
  const adminA: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminAEmail,
        password: RandomGenerator.alphaNumeric(10) + "!", // at least 8 chars
        display_name: RandomGenerator.name(2),
        href: "https://test.example.com/join", // dummy URI
        referrer: "https://referrer.example.com/",
        ip: null,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(adminA);
  TestValidator.equals("admin email matches input", adminA.email, adminAEmail);
  // 2. Register Admin B (optional, but for extended scenarios)
  const adminBEmail = RandomGenerator.alphaNumeric(12) + "@admin.com";
  const adminB: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminBEmail,
        password: RandomGenerator.alphaNumeric(10) + "#",
        display_name: RandomGenerator.name(2),
        href: "https://test.example.com/join",
        referrer: "https://referrer.example.com/",
        ip: null,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(adminB);
  // 3. Admin A creates a community
  const communityReq = {
    name: RandomGenerator.alphaNumeric(8).toLowerCase(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.admin.communities.create(
      connection,
      { body: communityReq },
    );
  typia.assert(community);
  // 4. Simulate issuing a moderator invitation (create a fake invitation; in practice, would call invitation-issue endpoint)
  // Since there is NO invitation creation API in the provided API list, we simulate invitation by directly using a random instance
  const moderatorInvitation: ICommunityPlatformCommunityModeratorInvitation =
    typia.random<ICommunityPlatformCommunityModeratorInvitation>();
  // But set community_platform_community_id to match created community
  moderatorInvitation.community_platform_community_id = community.id;
  // 5. Admin fetches invitation details using provided API, using the known community id and the invitation id
  const output: ICommunityPlatformCommunityModeratorInvitation =
    await api.functional.communityPlatform.admin.communities.moderatorInvitations.at(
      connection,
      {
        communityId: community.id,
        invitationId: moderatorInvitation.id,
      },
    );
  typia.assert(output);
  TestValidator.equals(
    "community id in invitation matches",
    output.community_platform_community_id,
    community.id,
  );
}
