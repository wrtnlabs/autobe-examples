import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test retrieving comment votes filtered by vote type, alternately using "upvote" and "downvote".
 * Verify that the returned list contains only the specified vote type. Confirm pagination and that all items in data array match the vote type filter.
 * Perform multiple paginated requests to ensure consistent filtering and pagination behavior.
 * This tests vote type filtering and pagination robustness.
 */
export async function test_api_community_platform_comment_vote_filter_by_vote_type(
  connection: api.IConnection,
): Promise<void> {
  // Prepare admin connection (assuming authorization is required)
  const adminConnection: api.IConnection = { host: connection.host };
  // We test filtering by voteType with 'upvote' and 'downvote', paging through pages
  const voteTypes = ["upvote", "downvote"] as const;
  for (const voteType of voteTypes) {
    let previousPage = 0;
    let currentPage = 1;
    const limit = 5;
    while (true) {
      const response =
        await api.functional.communityPlatform.commentVotes.index(
          adminConnection,
          {
            body: {
              voteType: voteType,
              page: currentPage,
              limit: limit,
            },
          },
        );
      typia.assert(response);
      // Check pagination current page correctness
      TestValidator.predicate(
        `pagination current page should be ${currentPage} for voteType '${voteType}'`,
        response.pagination.current === currentPage,
      );
      // Check that every item in data matches the voteType requested
      for (const vote of response.data) {
        TestValidator.equals(
          "voteType matches filter",
          vote.voteType,
          voteType,
        );
        // Additional type safety checks
        typia.assert(vote.id);
        typia.assert(vote.communityPlatformCommentId);
        typia.assert(vote.createdAt);
        typia.assert(vote.updatedAt);
        if (vote.deletedAt !== null) typia.assert(vote.deletedAt);
      }
      // If number of returned items less than limit, no more pages
      if (response.data.length < limit) break;
      // Prevent infinite loop
      previousPage = currentPage;
      currentPage++;
      if (currentPage > previousPage + 10) break; // max 10 pages
    }
  }
}
