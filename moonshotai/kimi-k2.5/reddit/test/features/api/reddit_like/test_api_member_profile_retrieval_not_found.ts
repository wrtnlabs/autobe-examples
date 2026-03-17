import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test valid error handling when retrieving a non-existent member profile.
 *
 * This test validates that the GET /redditLike/members/{memberId} endpoint
 * correctly returns HTTP 404 Not Found when the specified memberId does not
 * exist in the system. This ensures proper error handling for missing resources.
 */
export async function test_api_member_profile_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Generate a valid UUID format that does not exist in the system
  const nonExistentMemberId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve member with non-existent ID and verify 404 is returned
  await TestValidator.httpError(
    "should return 404 Not Found for non-existent member",
    404,
    async () => {
      await api.functional.redditLike.members.at(connection, {
        memberId: nonExistentMemberId,
      });
    },
  );
}
