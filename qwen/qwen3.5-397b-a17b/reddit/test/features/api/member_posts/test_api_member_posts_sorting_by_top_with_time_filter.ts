import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImage";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_posts_vote_create } from "../../../generate/generate_random_reddit_community_member_posts_vote_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_post_vote } from "../../../prepare/prepare_random_reddit_community_post_vote";

export async function test_api_member_posts_sorting_by_top_with_time_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create requester member (who will retrieve posts)
  const requesterConnection: api.IConnection = { host: connection.host };
  const requesterAuth = await authorize_member_join(requesterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(requesterAuth);
  requesterConnection.headers = {
    ...requesterConnection.headers,
    Authorization: `Bearer ${requesterAuth.token.access}`,
  };
  // 2. Create target member (whose posts will be retrieved)
  const targetConnection: api.IConnection = { host: connection.host };
  const targetAuth = await authorize_member_join(targetConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(targetAuth);
  targetConnection.headers = {
    ...targetConnection.headers,
    Authorization: `Bearer ${targetAuth.token.access}`,
  };
  const targetMemberId = targetAuth.id;
  // 3. Create community owned by target member
  const community =
    await generate_random_reddit_community_member_communities_create(
      targetConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 4. Subscribe target member to the community
  const subscription =
    await api.functional.redditCommunity.member.communities.subscription.create(
      targetConnection,
      {
        communityName: community.name,
      },
    );
  typia.assert(subscription);
  // 5. Create multiple posts with different content
  const post1 = await api.functional.redditCommunity.member.posts.create(
    targetConnection,
    {
      body: {
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 1 }),
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post1);
  const post2 = await api.functional.redditCommunity.member.posts.create(
    targetConnection,
    {
      body: {
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 1 }),
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post2);
  const post3 = await api.functional.redditCommunity.member.posts.create(
    targetConnection,
    {
      body: {
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 1 }),
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post3);
  // 6. Create third voter for additional votes
  const voter3Connection: api.IConnection = { host: connection.host };
  const voter3Auth = await authorize_member_join(voter3Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(voter3Auth);
  voter3Connection.headers = {
    ...voter3Connection.headers,
    Authorization: `Bearer ${voter3Auth.token.access}`,
  };
  // Subscribe voter3 to community
  await api.functional.redditCommunity.member.communities.subscription.create(
    voter3Connection,
    {
      communityName: community.name,
    },
  );
  // 7. Cast votes to create different vote scores
  // Post1: 3 upvotes (score = 3) - requester, target, voter3
  await api.functional.redditCommunity.member.posts.vote.create(
    requesterConnection,
    {
      postId: post1.id,
      body: { direction: "UPVOTE" } satisfies IRedditCommunityPostVote.ICreate,
    },
  );
  await api.functional.redditCommunity.member.posts.vote.create(
    targetConnection,
    {
      postId: post1.id,
      body: { direction: "UPVOTE" } satisfies IRedditCommunityPostVote.ICreate,
    },
  );
  await api.functional.redditCommunity.member.posts.vote.create(
    voter3Connection,
    {
      postId: post1.id,
      body: { direction: "UPVOTE" } satisfies IRedditCommunityPostVote.ICreate,
    },
  );
  // Post2: 1 upvote (score = 1) - requester only
  await api.functional.redditCommunity.member.posts.vote.create(
    requesterConnection,
    {
      postId: post2.id,
      body: { direction: "UPVOTE" } satisfies IRedditCommunityPostVote.ICreate,
    },
  );
  // Post3: 2 downvotes (score = -2) - requester and voter3
  await api.functional.redditCommunity.member.posts.vote.create(
    requesterConnection,
    {
      postId: post3.id,
      body: {
        direction: "DOWNVOTE",
      } satisfies IRedditCommunityPostVote.ICreate,
    },
  );
  await api.functional.redditCommunity.member.posts.vote.create(
    voter3Connection,
    {
      postId: post3.id,
      body: {
        direction: "DOWNVOTE",
      } satisfies IRedditCommunityPostVote.ICreate,
    },
  );
  // 8. Test sort='top' with timeFilter='all' (no time restriction)
  const topAllResult =
    await api.functional.redditCommunity.member.members.posts.index(
      requesterConnection,
      {
        memberId: targetMemberId,
        body: {
          sort: "top",
          timeFilter: "all",
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityPost.IRequest,
      },
    );
  typia.assert(topAllResult);
  TestValidator.predicate(
    "top all: posts ordered by vote_score DESC",
    () =>
      topAllResult.data.length >= 3 &&
      topAllResult.data[0].vote_score >= topAllResult.data[1].vote_score &&
      topAllResult.data[1].vote_score >= topAllResult.data[2].vote_score,
  );
  // 9. Test sort='top' with timeFilter='today'
  const topTodayResult =
    await api.functional.redditCommunity.member.members.posts.index(
      requesterConnection,
      {
        memberId: targetMemberId,
        body: {
          sort: "top",
          timeFilter: "today",
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityPost.IRequest,
      },
    );
  typia.assert(topTodayResult);
  TestValidator.predicate(
    "top today: returns posts created today",
    () => topTodayResult.data.length > 0,
  );
  // 10. Test sort='top' with timeFilter='week'
  const topWeekResult =
    await api.functional.redditCommunity.member.members.posts.index(
      requesterConnection,
      {
        memberId: targetMemberId,
        body: {
          sort: "top",
          timeFilter: "week",
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityPost.IRequest,
      },
    );
  typia.assert(topWeekResult);
  TestValidator.predicate(
    "top week: returns posts from this week",
    () => topWeekResult.data.length > 0,
  );
  // 11. Test sort='top' with timeFilter='month'
  const topMonthResult =
    await api.functional.redditCommunity.member.members.posts.index(
      requesterConnection,
      {
        memberId: targetMemberId,
        body: {
          sort: "top",
          timeFilter: "month",
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityPost.IRequest,
      },
    );
  typia.assert(topMonthResult);
  TestValidator.predicate(
    "top month: returns posts from this month",
    () => topMonthResult.data.length > 0,
  );
  // 12. Test sort='top' with timeFilter='year'
  const topYearResult =
    await api.functional.redditCommunity.member.members.posts.index(
      requesterConnection,
      {
        memberId: targetMemberId,
        body: {
          sort: "top",
          timeFilter: "year",
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityPost.IRequest,
      },
    );
  typia.assert(topYearResult);
  TestValidator.predicate(
    "top year: returns posts from this year",
    () => topYearResult.data.length > 0,
  );
  // 13. Test sort='new' (ordered by created_at DESC)
  const newResult =
    await api.functional.redditCommunity.member.members.posts.index(
      requesterConnection,
      {
        memberId: targetMemberId,
        body: {
          sort: "new",
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityPost.IRequest,
      },
    );
  typia.assert(newResult);
  TestValidator.predicate(
    "new: posts ordered by created_at DESC",
    () =>
      newResult.data.length >= 2 &&
      new Date(newResult.data[0].created_at).getTime() >=
        new Date(newResult.data[1].created_at).getTime(),
  );
  // 14. Test sort='hot' (engagement-weighted ordering)
  const hotResult =
    await api.functional.redditCommunity.member.members.posts.index(
      requesterConnection,
      {
        memberId: targetMemberId,
        body: {
          sort: "hot",
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityPost.IRequest,
      },
    );
  typia.assert(hotResult);
  TestValidator.predicate(
    "hot: returns posts with engagement weighting",
    () => hotResult.data.length > 0,
  );
  // 15. Test sort='controversial'
  const controversialResult =
    await api.functional.redditCommunity.member.members.posts.index(
      requesterConnection,
      {
        memberId: targetMemberId,
        body: {
          sort: "controversial",
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityPost.IRequest,
      },
    );
  typia.assert(controversialResult);
  TestValidator.predicate(
    "controversial: returns posts",
    () => controversialResult.data.length > 0,
  );
  // 16. Verify pagination metadata
  TestValidator.predicate(
    "pagination: current page is 1",
    () => topAllResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination: limit is respected",
    () => topAllResult.pagination.limit <= 10,
  );
  TestValidator.predicate(
    "pagination: records count is valid",
    () => topAllResult.pagination.records >= topAllResult.data.length,
  );
}
