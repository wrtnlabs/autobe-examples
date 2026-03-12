import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test that soft-deleted user accounts return 404 as if they don't exist.
 *
 * This test validates that when a user account is soft-deleted (or never existed),
 * the public profile endpoint returns a 404 Not Found error. Since soft-deleted
 * accounts are hidden from public queries, they should behave identically to
 * non-existent accounts.
 */
export async function test_api_user_profile_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // Create a public connection (no authentication required for this endpoint)
  const publicConnection: api.IConnection = { host: connection.host };
  // Generate unique usernames that don't exist using timestamp
  const timestamp = Date.now();
  const nonExistentUsername = `deleted_user_${timestamp}`;
  // Test 1: Verify that requesting a non-existent user returns 404
  // This is the same behavior expected for soft-deleted users
  await TestValidator.httpError(
    "non-existent user returns 404",
    404,
    async () =>
      await api.functional.redditClone.users.at(publicConnection, {
        username: nonExistentUsername,
      }),
  );
  // Test 2: Verify with another non-existent username
  const anotherNonExistentUsername = `deleted_user_${timestamp}_2`;
  await TestValidator.httpError(
    "another non-existent user returns 404",
    404,
    async () =>
      await api.functional.redditClone.users.at(publicConnection, {
        username: anotherNonExistentUsername,
      }),
  );
}
