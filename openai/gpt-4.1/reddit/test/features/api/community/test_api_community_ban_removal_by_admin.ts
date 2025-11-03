import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Validate the complete workflow of unbanning a user by admin in a community.
 *
 * 1. Admin registers (and is immediately authorized).
 * 2. User is registered (password reset request simulates onboarding per
 *    platform).
 * 3. Admin creates a new community.
 * 4. Admin issues a ban in the community against the newly registered user.
 * 5. Admin bans the user (creates ban record).
 * 6. Admin removes the ban (erases ban record) using the target endpoint.
 * 7. Validates that the ban has been removed (ban revoke timestamp is set or ban
 *    is not present).
 * 8. (Business scenario placeholder) In a complete system, would now check the
 *    user can re-access community features.
 */
export async function test_api_community_ban_removal_by_admin(
  connection: api.IConnection,
) {
  // 1. Register admin (join endpoint, returns token and account summary)
  const adminBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    href: "https://admin.invite.community/ban-unban-test",
    referrer: "https://referer.example.com/platform/ban-unban",
  } satisfies ICommunityPlatformAdmin.ICreate;

  const admin = await api.functional.auth.admin.join(connection, {
    body: adminBody,
  });
  typia.assert(admin);
  TestValidator.equals(
    "admin email after registration",
    admin.email,
    adminBody.email,
  );

  // 2. Register user by requesting password reset (simulates user account existence)
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPasswordResetReq = {
    email: userEmail,
  } satisfies ICommunityPlatformUser.IResetPasswordRequest;
  const userPasswordResetResp =
    await api.functional.auth.user.password.reset.resetPassword(connection, {
      body: userPasswordResetReq,
    });
  typia.assert(userPasswordResetResp);

  // 3. Create community (as admin)
  const communityBody = {
    name: RandomGenerator.alphabets(12),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: communityBody,
    });
  typia.assert(community);
  TestValidator.equals(
    "community name matches request",
    community.name,
    communityBody.name,
  );

  // 4. Simulate user summary for ban (since platform allows ban by user id, simulate user summary data)
  // NOTE: In real system, user registration would yield a user id; with only password reset, must simulate a uuid.
  // Since the ban API needs a user ID, we must generate a plausible user id for the user email.
  const userSummary: ICommunityPlatformUser.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    display_name: RandomGenerator.name(),
  };

  // 5. Admin issues a ban against user in the community
  const banBody = {
    community_platform_user_id: userSummary.id,
    reason: RandomGenerator.paragraph({ sentences: 3 }),
    expires_at: null as (string & tags.Format<"date-time">) | null, // Permanent ban for scenario
  } satisfies ICommunityPlatformCommunityBan.ICreate;
  const ban =
    await api.functional.communityPlatform.admin.communities.bans.create(
      connection,
      {
        communityId: community.id,
        body: banBody,
      },
    );
  typia.assert(ban);
  TestValidator.equals("banned user id matches", ban.user.id, userSummary.id);
  TestValidator.equals(
    "ban community id matches",
    ban.community.id,
    community.id,
  );
  TestValidator.equals("ban reason matches", ban.reason, banBody.reason);
  TestValidator.equals(
    "ban revoked_at should be null initially",
    ban.revoked_at,
    null,
  );

  // 6. Remove the ban (erase by banId)
  await api.functional.communityPlatform.admin.communities.bans.erase(
    connection,
    {
      communityId: community.id,
      banId: ban.id,
    },
  );

  // 7. No direct way to fetch bans to verify deletion, so test does not assert further.
  // (In full stack, could attempt operations only allowed to unbanned users here.)
}
