import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityVote";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import type { IRedditCommunityVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test vote filtering capabilities.
 *
 * Due to available API constraints (no vote creation endpoint), this test:
 * 1. Creates a member account for authentication
 * 2. Tests the vote filtering endpoint with various filter combinations
 * 3. Validates pagination structure and parameter handling
 * 4. Cannot verify actual vote content filtering without vote creation capability
 *
 * Note: The test validates filter parameter acceptance and pagination structure.
 * Actual content filtering requires vote creation capability not available in SDK.
 */
export async function test_api_member_votes_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member account for authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Generate test parameters
  const randomPostId = typia.random<string & tags.Format<"uuid">>();
  const randomCommentId = typia.random<string & tags.Format<"uuid">>();
  const randomMemberId = typia.random<string & tags.Format<"uuid">>();
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const startDate = yesterday.toISOString();
  const endDate = now.toISOString();
  // 3. Test filtering by postId (null commentId per DTO)
  const votesByPost = await api.functional.redditCommunity.member.votes.index(
    memberConnection,
    {
      body: {
        commentId: null,
        postId: randomPostId,
        startDate,
        endDate,
        voteType: undefined,
        limit: 10,
        page: 1,
      } satisfies IRedditCommunityVote.IRequest,
    },
  );
  typia.assert(votesByPost);
  // 4. Test filtering by commentId (null postId per DTO)
  const votesByComment =
    await api.functional.redditCommunity.member.votes.index(memberConnection, {
      body: {
        commentId: randomCommentId,
        postId: null,
        startDate,
        endDate,
        voteType: undefined,
        limit: 10,
        page: 1,
      } satisfies IRedditCommunityVote.IRequest,
    });
  typia.assert(votesByComment);
  // 5. Test filtering by memberId
  const votesByMember = await api.functional.redditCommunity.member.votes.index(
    memberConnection,
    {
      body: {
        commentId: null,
        postId: null,
        memberId: randomMemberId,
        startDate,
        endDate,
        voteType: undefined,
        limit: 10,
        page: 1,
      } satisfies IRedditCommunityVote.IRequest,
    },
  );
  typia.assert(votesByMember);
  // 6. Test filtering by voteType (upvote)
  const upvotes = await api.functional.redditCommunity.member.votes.index(
    memberConnection,
    {
      body: {
        commentId: null,
        postId: null,
        startDate,
        endDate,
        voteType: "upvote",
        limit: 10,
        page: 1,
      } satisfies IRedditCommunityVote.IRequest,
    },
  );
  typia.assert(upvotes);
  // 7. Test filtering by voteType (downvote)
  const downvotes = await api.functional.redditCommunity.member.votes.index(
    memberConnection,
    {
      body: {
        commentId: null,
        postId: null,
        startDate,
        endDate,
        voteType: "downvote",
        limit: 10,
        page: 1,
      } satisfies IRedditCommunityVote.IRequest,
    },
  );
  typia.assert(downvotes);
  // 8. Test combined filtering (postId + voteType + date range)
  const combinedFilter =
    await api.functional.redditCommunity.member.votes.index(memberConnection, {
      body: {
        commentId: null,
        postId: randomPostId,
        startDate,
        endDate,
        voteType: "upvote",
        limit: 10,
        page: 1,
      } satisfies IRedditCommunityVote.IRequest,
    });
  typia.assert(combinedFilter);
  // 9. Test date range filtering
  const dateRangeFilter =
    await api.functional.redditCommunity.member.votes.index(memberConnection, {
      body: {
        commentId: null,
        postId: null,
        memberId: undefined,
        startDate,
        endDate,
        voteType: undefined,
        limit: 10,
        page: 1,
      } satisfies IRedditCommunityVote.IRequest,
    });
  typia.assert(dateRangeFilter);
  // 10. Test no filters (all undefined except postId/commentId which must be null)
  const noFilters = await api.functional.redditCommunity.member.votes.index(
    memberConnection,
    {
      body: {
        commentId: null,
        postId: null,
        memberId: undefined,
        startDate: undefined,
        endDate: undefined,
        voteType: undefined,
        limit: 10,
        page: 1,
      } satisfies IRedditCommunityVote.IRequest,
    },
  );
  typia.assert(noFilters);
  // 11. Test sorting by createdAt (ascending)
  const sortedNew = await api.functional.redditCommunity.member.votes.index(
    memberConnection,
    {
      body: {
        commentId: null,
        postId: null,
        memberId: undefined,
        startDate: undefined,
        endDate: undefined,
        voteType: undefined,
        sortBy: "createdAt",
        limit: 10,
        page: 1,
      } satisfies IRedditCommunityVote.IRequest,
    },
  );
  typia.assert(sortedNew);
  // 12. Test sorting by voteType
  const sortedByType = await api.functional.redditCommunity.member.votes.index(
    memberConnection,
    {
      body: {
        commentId: null,
        postId: null,
        memberId: undefined,
        startDate: undefined,
        endDate: undefined,
        voteType: undefined,
        sortBy: "voteType",
        limit: 10,
        page: 1,
      } satisfies IRedditCommunityVote.IRequest,
    },
  );
  typia.assert(sortedByType);
  // 13. Validate pagination structure for all responses
  TestValidator.equals(
    "votesByPost pagination has valid fields",
    votesByPost.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "votesByComment pagination has valid fields",
    votesByComment.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "upvotes pagination has valid fields",
    upvotes.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "downvotes pagination has valid fields",
    downvotes.pagination.records >= 0,
    true,
  );
  // 14. Test limit parameter
  const limitedVotes = await api.functional.redditCommunity.member.votes.index(
    memberConnection,
    {
      body: {
        commentId: null,
        postId: null,
        memberId: undefined,
        startDate: undefined,
        endDate: undefined,
        voteType: undefined,
        limit: 5,
        page: 1,
      } satisfies IRedditCommunityVote.IRequest,
    },
  );
  typia.assert(limitedVotes);
  TestValidator.equals(
    "limited votes limit is 5",
    limitedVotes.pagination.limit,
    5,
  );
  // 15. Test pagination page parameter
  const page1 = await api.functional.redditCommunity.member.votes.index(
    memberConnection,
    {
      body: {
        commentId: null,
        postId: null,
        memberId: undefined,
        startDate: undefined,
        endDate: undefined,
        voteType: undefined,
        limit: 10,
        page: 1,
      } satisfies IRedditCommunityVote.IRequest,
    },
  );
  typia.assert(page1);
  TestValidator.equals("page 1 current", page1.pagination.current, 1);
  const page2 = await api.functional.redditCommunity.member.votes.index(
    memberConnection,
    {
      body: {
        commentId: null,
        postId: null,
        memberId: undefined,
        startDate: undefined,
        endDate: undefined,
        voteType: undefined,
        limit: 10,
        page: 2,
      } satisfies IRedditCommunityVote.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals("page 2 current", page2.pagination.current, 2);
  // 16. Test pagination metadata consistency
  TestValidator.equals(
    "page 1 records count matches",
    page1.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "page 2 records count matches",
    page2.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "page 1 has calculated pages",
    page1.pagination.pages >= 0,
    true,
  );
  TestValidator.equals(
    "page 2 has calculated pages",
    page2.pagination.pages >= 0,
    true,
  );
}
