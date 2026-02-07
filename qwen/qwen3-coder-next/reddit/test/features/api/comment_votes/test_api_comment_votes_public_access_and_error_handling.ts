import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommentVote";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_comment_votes_public_access_and_error_handling(
  connection: api.IConnection,
): Promise<void> {
  // Create a test comment first to have a valid comment with votes
  // Note: This assumes there's a way to create a comment via API
  // For now, we'll generate a random UUID for valid comment testing
  // 1. Test public access to comment votes (no authentication required)
  const validCommentId = typia.random<string & tags.Format<"uuid">>();
  const votesResponse =
    await api.functional.redditPlatform.comments.votes.index(connection, {
      commentId: validCommentId,
    });
  typia.assert(votesResponse);
  // Validate response structure using typia which already validates types
  TestValidator.predicate(
    "response has pagination",
    votesResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "response has data array",
    Array.isArray(votesResponse.data),
  );
  // 2. Test with non-existent comment ID (should return error)
  const nonExistentId = "00000000-0000-0000-0000-000000000000"; // Nil UUID
  await TestValidator.error(
    "non-existent comment should return error",
    async () => {
      await api.functional.redditPlatform.comments.votes.index(connection, {
        commentId: nonExistentId,
      });
    },
  );
  // 3. Test with malformed comment ID format
  const malformedId = "not-a-valid-uuid";
  await TestValidator.error(
    "malformed comment ID should return error",
    async () => {
      await api.functional.redditPlatform.comments.votes.index(connection, {
        commentId: malformedId,
      });
    },
  );
  // 4. Test with empty string comment ID
  await TestValidator.error(
    "empty comment ID should return error",
    async () => {
      await api.functional.redditPlatform.comments.votes.index(connection, {
        commentId: "",
      });
    },
  );
  // 5. Test with special malformed formats
  await TestValidator.error(
    "malformed UUID format should return error",
    async () => {
      await api.functional.redditPlatform.comments.votes.index(connection, {
        commentId: "12345",
      });
    },
  );
  await TestValidator.error("partial UUID should return error", async () => {
    await api.functional.redditPlatform.comments.votes.index(connection, {
      commentId: "123e4567-1234-1234-1234-12345678901", // Missing last character
    });
  });
}
