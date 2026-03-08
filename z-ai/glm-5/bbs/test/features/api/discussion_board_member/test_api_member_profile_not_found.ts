import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test that requesting a non-existent member's profile returns 404 Not Found.
 *
 * This test verifies the business rule that the discussion board member profile
 * endpoint returns HTTP 404 when:
 * - The member ID doesn't exist in the database
 * - The member has been soft-deleted (deleted_at is not null)
 *
 * The endpoint is public and doesn't require authentication.
 * We use a randomly generated UUID that is guaranteed not to exist.
 */
export async function test_api_member_profile_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random UUID that doesn't exist in the database
  const nonExistentMemberId = typia.random<string & tags.Format<"uuid">>();
  // Verify that requesting a non-existent member returns 404 Not Found
  await TestValidator.httpError(
    "non-existent member should return 404",
    404,
    async () => {
      await api.functional.discussionBoard.members.at(connection, {
        memberId: nonExistentMemberId,
      });
    },
  );
}
