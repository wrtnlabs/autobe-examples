import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
import type { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import type { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import type { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
import type { ICommunityHubPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPostImage";
import type { ICommunityHubVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityHubPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_hub_communities_posts_create } from "../../../generate/generate_random_community_hub_communities_posts_create";
import { generate_random_community_hub_member_communities_create } from "../../../generate/generate_random_community_hub_member_communities_create";
import { prepare_random_community_hub_community } from "../../../prepare/prepare_random_community_hub_community";
import { prepare_random_community_hub_post } from "../../../prepare/prepare_random_community_hub_post";

/**
 * Test popular feed top sort with week time filter.
 *
 * Verifies that the popular feed correctly applies descending vote score sort
 * order when displaying posts created within the current week. Two posts are
 * created in a community: one receives an upvote to boost its score, the other
 * has no votes. The test confirms the upvoted post appears before the
 * non-upvoted post in the feed data array.
 *
 * 1. Member joins and authenticates via authorize_member_join.
 * 2. Community is created to host test posts.
 * 3. First text post is created and upvoted by its author.
 * 4. Second text post is created with no votes.
 * 5. Popular feed is queried through the public endpoint.
 * 6. Validates the upvoted post (higher vote score) appears first,
 *    confirming descending vote_score sort order is applied.
 */
export async function test_api_popular_feed_top_sort_with_week_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a community
  const community =
    await generate_random_community_hub_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Create first post and upvote it
  const post1 = await generate_random_community_hub_communities_posts_create(
    memberConnection,
    {
      body: { type: "text" } satisfies DeepPartial<ICommunityHubPost.ICreate>,
      params: { communityName: community.name },
    },
  );
  typia.assert(post1);
  const vote = await api.functional.communityHub.member.posts.upvote(
    memberConnection,
    { postId: post1.id },
  );
  typia.assert(vote);
  // 4. Create second post with no votes
  const post2 = await generate_random_community_hub_communities_posts_create(
    memberConnection,
    {
      body: { type: "text" } satisfies DeepPartial<ICommunityHubPost.ICreate>,
      params: { communityName: community.name },
    },
  );
  typia.assert(post2);
  // 5. Query popular feed (public endpoint, no auth required)
  const feed = await api.functional.communityHub.feed.popular(connection);
  typia.assert(feed);
  // 6. Validate sort order by vote_score descending
  TestValidator.predicate("feed contains enough posts", feed.data.length >= 2);
  const post1Index = feed.data.findIndex((p) => p.id === post1.id);
  const post2Index = feed.data.findIndex((p) => p.id === post2.id);
  TestValidator.predicate("upvoted post present in feed", post1Index !== -1);
  TestValidator.predicate(
    "non-upvoted post present in feed",
    post2Index !== -1,
  );
  TestValidator.predicate(
    "upvoted post has higher vote score",
    feed.data[post1Index]!.vote_score > feed.data[post2Index]!.vote_score,
  );
  TestValidator.predicate(
    "upvoted post appears before non-upvoted post",
    post1Index < post2Index,
  );
}
