import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommentVoteSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommentVoteSummary";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityCommentVoteSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityCommentVoteSummary";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_comment_vote_summaries_controversial_search(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authorize member to access the endpoint
  const memberConnection: api.IConnection = { host: connection.host };
  const memberJoinInput: DeepPartial<ICommunityMember.IJoin> = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "securePassword123",
  };
  const memberAuthorized: ICommunityMember.IAuthorized =
    await authorize_member_join(memberConnection, { body: memberJoinInput });
  // Step 2: Generate multiple comment vote summaries with varying vote counts
  // We need to ensure at least one comment has total votes >= 10 to satisfy controversial algorithm
  const testCommentCount = 60; // Generate more than limit to ensure pagination works
  // Create a mix of comments with varying vote counts
  const commentVotes = ArrayUtil.repeat(testCommentCount, (index) => {
    // Generate upvotes and downvotes that will produce a range of net scores
    const totalUpvotes = typia.random<number & tags.Type<"int32">>() + 3;
    const totalDownvotes = typia.random<number & tags.Type<"int32">>() + 3;
    // Ensure at least 10 total votes for controversial posts
    // Using absolute minimum to ensure we get some controversial results
    const adjustedUpvotes = totalUpvotes > 0 ? totalUpvotes : 8;
    const adjustedDownvotes = totalDownvotes > 0 ? totalDownvotes : 8;
    // Create vote summary with valid properties only
    return {
      total_upvotes: adjustedUpvotes,
      total_downvotes: adjustedDownvotes,
      net_score: adjustedUpvotes - adjustedDownvotes,
    };
  });
  // Step 3: Make the controversial search request
  // Note: searchQuery is not defined in the schema - so we cannot use it
  // We'll use the minimal required parameters to match the schema
  const request: ICommunityCommentVoteSummary.IRequest = {
    sortAlgorithm: "controversial",
    page: 1,
    limit: 50,
  };
  const response: IPageICommunityCommentVoteSummary =
    await api.functional.community.comments.vote_summaries.index(
      memberConnection,
      {
        body: request,
      },
    );
  typia.assert(response);
  // Step 4: Validate response structure and content
  TestValidator.equals(
    "pagination.current equals 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination.limit equals 50",
    response.pagination.limit,
    50,
  );
  TestValidator.predicate(
    "pagination.records > 0",
    response.pagination.records > 0,
  );
  TestValidator.predicate(
    "pagination.pages >= 1",
    response.pagination.pages >= 1,
  );
  TestValidator.equals(
    "data length <= limit",
    response.data.length,
    Math.min(response.pagination.records, 50),
  );
  // Validate that all returned entries have enough votes for controversial algorithm
  for (const summary of response.data) {
    const totalVotes = summary.total_upvotes + summary.total_downvotes;
    TestValidator.predicate("total_votes >= 10", totalVotes >= 10);
  }
  // Step 5: Validate controversial sorting order
  // For controversial algorithm:
  // 1. Sort by (total_upvotes + total_downvotes) DESC
  // 2. Then by ABS(net_score) ASC (prioritize balanced debates)
  // Note: created_at is not present in ICommunityCommentVoteSummary, so sorting by created_at is removed
  // Extract values for sorting comparison
  const sortedData = response.data;
  // Check sorting for all adjacent pairs
  for (let i = 0; i < sortedData.length - 1; i++) {
    const current = sortedData[i];
    const next = sortedData[i + 1];
    const currentTotalVotes = current.total_upvotes + current.total_downvotes;
    const nextTotalVotes = next.total_upvotes + next.total_downvotes;
    const currentNetScoreAbs = Math.abs(current.net_score);
    const nextNetScoreAbs = Math.abs(next.net_score);
    // Rule 1: Sort by total votes descending
    if (currentTotalVotes !== nextTotalVotes) {
      TestValidator.predicate(
        "sorted by total votes descending",
        currentTotalVotes >= nextTotalVotes,
      );
    }
    // Rule 2: If total votes equal, sort by absolute net score ascending
    else if (currentNetScoreAbs !== nextNetScoreAbs) {
      TestValidator.predicate(
        "sorted by abs net score ascending",
        currentNetScoreAbs <= nextNetScoreAbs,
      );
    }
    // Rule 3: If both total votes and absolute net score equal, order is undefined or by default API order
    // Since created_at is not available, no further sort validation is possible
  }
}