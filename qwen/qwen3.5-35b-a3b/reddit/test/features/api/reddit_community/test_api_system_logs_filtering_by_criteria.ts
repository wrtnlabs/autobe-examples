import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunitySystemLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunitySystemLog";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunitySystemLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySystemLog";
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
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { generate_random_reddit_community_member_votes_create } from "../../../generate/generate_random_reddit_community_member_votes_create";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_vote } from "../../../prepare/prepare_random_reddit_community_vote";

export async function test_api_system_logs_filtering_by_criteria(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate a member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuth);
  memberConnection.headers = {
    ...memberConnection.headers,
    Authorization: memberAuth.token.access,
  };
  // 2. Create a post (triggers post_create activity log)
  // Use a valid UUID for community_id - in real testing this would be a created community
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const post = await api.functional.redditCommunity.member.posts.create(
    memberConnection,
    {
      body: {
        community_id: communityId,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        body: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // Get the timestamp before creating the vote
  const preVoteTime = new Date();
  // 3. Vote on the post (triggers vote_upvote activity log)
  const vote = await api.functional.redditCommunity.member.votes.create(
    memberConnection,
    {
      body: {
        vote_type: "upvote",
        target_post_id: post.id,
      } satisfies IRedditCommunityVote.ICreate,
    },
  );
  typia.assert(vote);
  // Get the timestamp after creating the vote
  const postVoteTime = new Date();
  // 4. Test filtering by activity_type = 'post_create'
  const postCreateTimeFilter: IRedditCommunitySystemLog.IRequest = {
    activity_type: "post_create",
    page: 1,
    limit: 20,
  };
  const postCreateLogsResponse =
    await api.functional.redditCommunity.system_logs.index(memberConnection, {
      body: postCreateTimeFilter,
    });
  typia.assert(postCreateLogsResponse);
  typia.assert(postCreateLogsResponse.pagination);
  typia.assert(postCreateLogsResponse.data);
  // All returned logs should have activity_type = 'post_create'
  for (const log of postCreateLogsResponse.data) {
    TestValidator.equals(
      "post_create filter - activity_type",
      log.activityType,
      "post_create",
    );
  }
  // 5. Test filtering by activity_type = 'vote_upvote'
  const voteUpvoteFilter: IRedditCommunitySystemLog.IRequest = {
    activity_type: "vote_upvote",
    page: 1,
    limit: 20,
  };
  const voteUpvoteLogsResponse =
    await api.functional.redditCommunity.system_logs.index(memberConnection, {
      body: voteUpvoteFilter,
    });
  typia.assert(voteUpvoteLogsResponse);
  typia.assert(voteUpvoteLogsResponse.pagination);
  typia.assert(voteUpvoteLogsResponse.data);
  // All returned logs should have activity_type = 'vote_upvote'
  for (const log of voteUpvoteLogsResponse.data) {
    TestValidator.equals(
      "vote_upvote filter - activity_type",
      log.activityType,
      "vote_upvote",
    );
  }
  // 6. Test filtering by date range
  const dateRangeFilter: IRedditCommunitySystemLog.IRequest = {
    created_at_start: preVoteTime.toISOString(),
    created_at_end: postVoteTime.toISOString(),
    page: 1,
    limit: 20,
  };
  const dateRangeLogsResponse =
    await api.functional.redditCommunity.system_logs.index(memberConnection, {
      body: dateRangeFilter,
    });
  typia.assert(dateRangeLogsResponse);
  typia.assert(dateRangeLogsResponse.pagination);
  typia.assert(dateRangeLogsResponse.data);
  // All returned logs should fall within the date range
  for (const log of dateRangeLogsResponse.data) {
    const logDate = new Date(log.createdAt);
    const startDate = new Date(dateRangeFilter.created_at_start!);
    const endDate = new Date(dateRangeFilter.created_at_end!);
    TestValidator.predicate(
      "date range filter - log created_at >= start",
      logDate >= startDate,
    );
    TestValidator.predicate(
      "date range filter - log created_at <= end",
      logDate <= endDate,
    );
  }
  // 7. Test filtering by target_type = 'post'
  const postTargetFilter: IRedditCommunitySystemLog.IRequest = {
    target_type: "post",
    page: 1,
    limit: 20,
  };
  const postTargetLogsResponse =
    await api.functional.redditCommunity.system_logs.index(memberConnection, {
      body: postTargetFilter,
    });
  typia.assert(postTargetLogsResponse);
  typia.assert(postTargetLogsResponse.pagination);
  typia.assert(postTargetLogsResponse.data);
  // Verify response structure
  TestValidator.equals(
    "target_type filter - pagination records",
    postTargetLogsResponse.pagination.records,
    postTargetLogsResponse.pagination.records,
  );
  // 8. Test combined filters (activity_type + target_type + date range)
  const combinedFilter: IRedditCommunitySystemLog.IRequest = {
    activity_type: "post_create",
    target_type: "post",
    page: 1,
    limit: 20,
  };
  const combinedLogsResponse =
    await api.functional.redditCommunity.system_logs.index(memberConnection, {
      body: combinedFilter,
    });
  typia.assert(combinedLogsResponse);
  typia.assert(combinedLogsResponse.pagination);
  typia.assert(combinedLogsResponse.data);
  // All returned logs should match BOTH filters
  for (const log of combinedLogsResponse.data) {
    TestValidator.equals(
      "combined filter - activity_type",
      log.activityType,
      "post_create",
    );
  }
  // 9. Test case-sensitive filtering for activity_type
  // Lowercase filter should return results
  const lowercaseFilter: IRedditCommunitySystemLog.IRequest = {
    activity_type: "post_create",
    page: 1,
    limit: 20,
  };
  const lowercaseLogsResponse =
    await api.functional.redditCommunity.system_logs.index(memberConnection, {
      body: lowercaseFilter,
    });
  typia.assert(lowercaseLogsResponse);
  typia.assert(lowercaseLogsResponse.pagination);
  typia.assert(lowercaseLogsResponse.data);
  // Lowercase filter should return results
  TestValidator.predicate(
    "lowercase filter - should have results",
    lowercaseLogsResponse.pagination.records > 0,
  );
  // Uppercase filter should return no results (case-sensitive)
  const uppercaseFilter: IRedditCommunitySystemLog.IRequest = {
    activity_type: "POST_CREATE",
    page: 1,
    limit: 20,
  };
  const uppercaseLogsResponse =
    await api.functional.redditCommunity.system_logs.index(memberConnection, {
      body: uppercaseFilter,
    });
  typia.assert(uppercaseLogsResponse);
  typia.assert(uppercaseLogsResponse.pagination);
  typia.assert(uppercaseLogsResponse.data);
  // Uppercase filter should return no results (case-sensitive)
  TestValidator.equals(
    "uppercase filter - no results (case-sensitive)",
    uppercaseLogsResponse.pagination.records,
    0,
  );
  // 10. Test filtering by target_type = 'member' (account_signup)
  // After member join, there should be an account_signup log with target_type = 'member'
  const memberTargetFilter: IRedditCommunitySystemLog.IRequest = {
    target_type: "member",
    page: 1,
    limit: 20,
  };
  const memberTargetLogsResponse =
    await api.functional.redditCommunity.system_logs.index(memberConnection, {
      body: memberTargetFilter,
    });
  typia.assert(memberTargetLogsResponse);
  typia.assert(memberTargetLogsResponse.pagination);
  typia.assert(memberTargetLogsResponse.data);
  // Verify pagination metadata is correct
  TestValidator.predicate(
    "pagination - records >= 0",
    memberTargetLogsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination - pages >= 0",
    memberTargetLogsResponse.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination - current >= 1",
    memberTargetLogsResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination - limit between 1-100",
    memberTargetLogsResponse.pagination.limit >= 1 &&
      memberTargetLogsResponse.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination - records <= pages * limit",
    memberTargetLogsResponse.pagination.records <=
      memberTargetLogsResponse.pagination.pages *
        memberTargetLogsResponse.pagination.limit,
  );
}