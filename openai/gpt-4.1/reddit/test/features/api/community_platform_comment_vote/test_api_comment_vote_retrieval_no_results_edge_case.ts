import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentVote";

/**
 * Test the comment votes search API for the edge case where all filters exclude
 * any possible votes.
 *
 * 1. Register a moderator for authentication.
 * 2. Issue commentVotes.index with a time range far in the future and a fake
 *    user_id, ensuring no existing records match.
 * 3. Assert data array is empty and pagination meta reflects zero records.
 * 4. Confirm all values match type and business expectations (zero records,
 *    requested page/limit reported back correctly).
 */
export async function test_api_comment_vote_retrieval_no_results_edge_case(
  connection: api.IConnection,
) {
  // 1. Register as moderator
  const moderatorInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    status: "active",
    business_status: null,
    href: "https://test.example.com/join",
    referrer: "https://test.example.com/landing",
    ip: null,
  } satisfies ICommunityPlatformModerator.ICreate;
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorInput,
  });
  typia.assert(moderator);

  // 2. Search for comment votes with filters that guarantee 0 results
  // Use a future date range and a non-existent user id (random uuid not created anywhere)
  const futureStart = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 365,
  ).toISOString(); // 1 year ahead
  const futureEnd = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 365 * 2,
  ).toISOString(); // 2 years ahead

  const filterRequest = {
    page: 1,
    limit: 10,
    vote_type: "up",
    user_id: typia.random<string & tags.Format<"uuid">>(),
    created_after: futureStart,
    created_before: futureEnd,
  } satisfies ICommunityPlatformCommentVote.IRequest;

  const result =
    await api.functional.communityPlatform.moderator.commentVotes.index(
      connection,
      { body: filterRequest },
    );
  typia.assert(result);

  // 3. Assert data array is empty
  TestValidator.equals(
    "comment votes - no matches data array is empty",
    result.data,
    [],
  );
  // 4. Assert pagination object is correct
  TestValidator.equals(
    "comment votes - pagination has zero records",
    result.pagination.records,
    0,
  );
  TestValidator.equals(
    "comment votes - pagination has zero pages",
    result.pagination.pages,
    0,
  );
  TestValidator.equals(
    "comment votes - current page as requested",
    result.pagination.current,
    1,
  );
  TestValidator.equals(
    "comment votes - limit as requested",
    result.pagination.limit,
    10,
  );
}
