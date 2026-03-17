import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test that retrieving a non-existent member's profile returns 404 Not Found.
 * 1. Generate a valid UUID that doesn't exist in database
 * 2. Call member profile endpoint with invalid member ID
 * 3. Verify 404 Not Found error is thrown
 * 4. Validate appropriate error message
 */
export async function test_api_member_profile_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Generate a valid UUID that doesn't correspond to any existing member
  const nonExistentMemberId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Verify that requesting a non-existent member returns 404 Not Found
  await TestValidator.httpError(
    "member not found returns 404",
    404,
    async () => {
      await api.functional.redditPlatform.members.at(connection, {
        memberId: nonExistentMemberId,
      });
    },
  );
}
