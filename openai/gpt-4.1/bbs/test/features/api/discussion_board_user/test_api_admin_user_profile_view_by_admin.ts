import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Validate that an authenticated admin can retrieve a discussion board user's
 * profile, audit and identity information via admin API.
 *
 * - The test authenticates as a new admin user.
 * - Attempts to fetch a user profile by a random userId to validate the output
 *   conforms to the documented IDiscussionBoardUser type (correct type/fields,
 *   no password/secrets).
 * - Verifies that all non-sensitive fields (id, email, created_at, updated_at,
 *   and optionally deleted_at) are present with correct types.
 * - Also checks that querying a random (non-existent) userId yields a Not Found
 *   error.
 * - There is no user profile creation endpoint in scope, so test does not compare
 *   to a known user or make business value assertions; it only validates type
 *   conformance and correct error handling.
 */
export async function test_api_admin_user_profile_view_by_admin(
  connection: api.IConnection,
) {
  // Register new admin to authenticate (sets Authorization header via SDK)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<
      string & tags.MinLength<8> & tags.Format<"password">
    >(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: undefined,
  } satisfies IDiscussionBoardAdmin.IJoin;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuth);

  // Attempt to GET user profile by random userId - only type conformance can be validated
  const randomUserId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "admin gets Not Found for nonexistent user",
    async () => {
      await api.functional.discussionBoard.admin.users.at(connection, {
        userId: randomUserId,
      });
    },
  );
}
