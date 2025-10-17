import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserKarma";

/**
 * Validate error behavior when requesting karma for a non-existent user.
 *
 * Business goal:
 *
 * - When a client requests GET /communityPlatform/users/{userId}/karma for a
 *   userId that does not exist, the server must respond with an error (e.g.,
 *   not found).
 *
 * Constraints and rules:
 *
 * - This endpoint is public; perform the call without authentication.
 * - Do not assert specific HTTP status codes or error bodies.
 * - Only validate that an error occurs.
 *
 * Steps:
 *
 * 1. Create an unauthenticated connection using the allowed pattern.
 * 2. Generate a random UUID that should not correspond to any user record.
 * 3. Call the karma endpoint inside TestValidator.error and await both the
 *    validator and the API call.
 */
export async function test_api_user_karma_user_not_found(
  connection: api.IConnection,
) {
  // 1) Create an unauthenticated connection (allowed pattern)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 2) Generate a random, non-existent userId
  const nonExistentUserId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3) Expect error when requesting karma for non-existent user
  await TestValidator.error(
    "requesting karma for a non-existent user should throw an error",
    async () => {
      await api.functional.communityPlatform.users.karma.at(unauthConn, {
        userId: nonExistentUserId,
      });
    },
  );
}
