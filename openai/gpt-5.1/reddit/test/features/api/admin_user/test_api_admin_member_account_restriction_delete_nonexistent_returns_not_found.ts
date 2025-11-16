import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";

/**
 * Validate that deleting a non-existent member account restriction episode as
 * an authenticated adminUser yields a 404-style HTTP error instead of silently
 * succeeding.
 *
 * Business context:
 *
 * - Admin users manage moderation restrictions on member accounts.
 * - When a moderator attempts to delete a restriction that does not exist (for
 *   example, a stale UI state or a race condition), the API must respond with a
 *   not-found style error rather than reporting success.
 * - Proper 404 semantics are important so that moderation tools can distinguish
 *   between successful deletions and no-op attempts.
 *
 * Steps:
 *
 * 1. Join as an adminUser using POST /auth/adminUser/join.
 *
 *    - This both creates the admin account and installs an Authorization header into
 *         the connection for subsequent calls.
 * 2. Prepare a random member username and a random UUID for accountRestrictionId
 *    that is virtually guaranteed not to exist for that member.
 * 3. Call DELETE
 *    /communityPlatform/adminUser/memberUsers/{username}/accountRestrictions/{accountRestrictionId}
 *    as the admin, wrapped in TestValidator.httpError so that we assert a 404
 *    Not Found style HTTP error.
 * 4. Do not attempt to verify side effects on other restrictions because there are
 *    no creation or listing APIs exposed in this context.
 */
export async function test_api_admin_member_account_restriction_delete_nonexistent_returns_not_found(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an adminUser
  const joinBody = typia.random<ICommunityPlatformAdminUserJoin.IRequest>();

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Prepare a random member username and non-existent restriction UUID
  const targetUsername: string = RandomGenerator.alphabets(12);
  const nonexistentRestrictionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Attempt to delete the non-existent restriction and expect 404
  await TestValidator.httpError(
    "deleting non-existent restriction must return 404",
    404,
    async () => {
      await api.functional.communityPlatform.adminUser.memberUsers.accountRestrictions.erase(
        connection,
        {
          username: targetUsername,
          accountRestrictionId: nonexistentRestrictionId,
        },
      );
    },
  );
}
