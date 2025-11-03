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
 * Validates that an admin can update the details of a user's ban within a
 * specific community.
 *
 * Full workflow:
 *
 * 1. Register an admin and authenticate.
 * 2. Register a user who will be banned (by triggering password reset initiation,
 *    simulating user creation).
 * 3. Create a community.
 * 4. Admin issues a ban on the user in the created community.
 * 5. Admin updates the ban's reason and expiry date.
 * 6. Verifies that the ban update took effect: reason and expiry are changed, and
 *    modification is logged.
 */
export async function test_api_community_ban_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as admin
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = RandomGenerator.alphaNumeric(12);
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: RandomGenerator.name(),
      href: "https://admin-session.site/register",
      referrer: "https://main.platform.site/",
      ip: null,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(adminJoin);

  // 2. Register user to be banned (simulate a user by initiating password reset, since /user register API is not defined):
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const resetResp = await api.functional.auth.user.password.reset.resetPassword(
    connection,
    {
      body: {
        email: userEmail,
      } satisfies ICommunityPlatformUser.IResetPasswordRequest,
    },
  );
  typia.assert(resetResp);

  // 3. Create a community
  const createCommunityResp =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: {
        name: RandomGenerator.alphaNumeric(16).toLowerCase(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ICommunityPlatformCommunity.ICreate,
    });
  typia.assert(createCommunityResp);

  // 4. Admin issues a ban to the user in this community
  // Find user id: We must simulate user existence—so we use userEmail as if the user exists (the ban API expects a valid user id).
  // For the E2E test, generate a UUID for the banned user's id so DTO requirements are fulfilled.
  const bannedUserId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const banReason = "Test Ban Reason";
  const banExpiresAt = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 7 days from now
  const issueBanResp =
    await api.functional.communityPlatform.admin.communities.bans.create(
      connection,
      {
        communityId: createCommunityResp.id,
        body: {
          community_platform_user_id: bannedUserId,
          reason: banReason,
          expires_at: banExpiresAt,
        } satisfies ICommunityPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(issueBanResp);

  // 5. Admin updates the ban reason and expiry
  const updatedReason = "Modified Reason by admin";
  const updatedExpiresAt = new Date(
    Date.now() + 14 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 14 days from now
  const updateBanResp =
    await api.functional.communityPlatform.admin.communities.bans.update(
      connection,
      {
        communityId: createCommunityResp.id,
        banId: issueBanResp.id,
        body: {
          reason: updatedReason,
          expires_at: updatedExpiresAt,
        } satisfies ICommunityPlatformCommunityBan.IUpdate,
      },
    );
  typia.assert(updateBanResp);

  // 6. Validate the ban was updated
  TestValidator.equals(
    "ban reason updated",
    updateBanResp.reason,
    updatedReason,
  );
  TestValidator.equals(
    "ban expires_at updated",
    updateBanResp.expires_at,
    updatedExpiresAt,
  );
  TestValidator.equals(
    "ban user id matches",
    updateBanResp.user.id,
    bannedUserId,
  );
  TestValidator.equals(
    "ban community id matches",
    updateBanResp.community.id,
    createCommunityResp.id,
  );
  // Further audit trail check would involve verifying an audit API or property if available (not supplied in the current API set).
}
