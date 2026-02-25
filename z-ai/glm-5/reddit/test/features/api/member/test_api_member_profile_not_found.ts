import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test member profile retrieval for non-existent member.
 *
 * This test validates that the GET /community/members/{memberUsername} endpoint
 * correctly returns a 404 NOT FOUND error when querying for a username that
 * does not exist in the system. The endpoint is public (no authentication required)
 * and performs case-insensitive username lookup while excluding soft-deleted accounts.
 *
 * Expected behavior:
 * - Return 404 NOT FOUND for non-existent usernames
 * - Return 404 NOT FOUND for soft-deleted member accounts
 * - No authentication required for this public endpoint
 */
export async function test_api_member_profile_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Generate a unique username that definitely does not exist
  const nonExistentUsername = `nonexistent_user_${RandomGenerator.alphaNumeric(8)}`;
  // Test: Requesting profile for non-existent username should return 404
  await TestValidator.httpError(
    "non-existent member profile should return 404",
    404,
    async () => {
      await api.functional.community.members.getByMemberusername(connection, {
        memberUsername: nonExistentUsername,
      });
    },
  );
  // Test with another random non-existent username to ensure consistent behavior
  const anotherNonExistentUsername = `deleted_user_${RandomGenerator.alphaNumeric(8)}`;
  await TestValidator.httpError(
    "another non-existent member profile should return 404",
    404,
    async () => {
      await api.functional.community.members.getByMemberusername(connection, {
        memberUsername: anotherNonExistentUsername,
      });
    },
  );
}
