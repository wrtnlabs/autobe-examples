import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPortalUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalUser";

/**
 * Test that retrieving a non-existent CommunityPortal user returns 404 Not
 * Found.
 *
 * Business intent:
 *
 * - Ensure the public profile retrieval endpoint correctly returns 404 when a
 *   requested user does not exist or is soft-deleted.
 *
 * Steps:
 *
 * 1. Generate a random UUID that does not correspond to any existing user.
 * 2. Use an unauthenticated connection (headers set to empty object).
 * 3. Call GET /communityPortal/users/{userId} and assert that the call throws an
 *    HTTP 404 error.
 */
export async function test_api_user_at_not_found(connection: api.IConnection) {
  // 1) Generate a random UUID (correct format: uuid)
  const nonExistentUserId = typia.random<string & tags.Format<"uuid">>();

  // 2) Use an unauthenticated connection by creating a shallow copy with empty headers
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 3) Expect a 404 Not Found when attempting to retrieve the non-existent user
  await TestValidator.httpError(
    "retrieving non-existent community portal user returns 404",
    404,
    async () =>
      await api.functional.communityPortal.users.at(unauthConn, {
        userId: nonExistentUserId,
      }),
  );
}
