import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
import type { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import type { ICommunityHubCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunitySubscription";
import type { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import type { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
import type { ICommunityHubPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPostImage";
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
 * Test that the home feed returns only posts from subscribed communities.
 *
 * Validates the personalization of the home feed by verifying that an
 * authenticated member sees posts from communities they have subscribed to.
 * The test covers the full flow from member registration through community
 * creation, subscription, post creation, and feed retrieval.
 *
 * 1. Register and authenticate a new member via join.
 * 2. Create a new community owned by the member.
 * 3. Subscribe the member to the community.
 * 4. Create multiple posts within the subscribed community.
 * 5. Retrieve the home feed with default sort and pagination.
 * 6. Assert all created posts appear in the feed with expected metadata
 *    including title, author username, and community name.
 */
export async function test_api_home_feed_subscribed_community_posts(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a new community
  const community =
    await generate_random_community_hub_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe the member to the community
  const subscription =
    await api.functional.communityHub.member.communities.subscriptions.create(
      memberConnection,
      { communityName: community.name },
    );
  typia.assert(subscription);
  // 4. Create several posts in the subscribed community
  const postCount = 3;
  const posts = await ArrayUtil.asyncRepeat(postCount, async () => {
    const post = await generate_random_community_hub_communities_posts_create(
      memberConnection,
      { params: { communityName: community.name } },
    );
    typia.assert(post);
    return post;
  });
  // 5. Call the home feed endpoint with default parameters
  const feed = await api.functional.communityHub.feed.home.index(
    memberConnection,
    {
      body: {} satisfies ICommunityHubPost.IRequest,
    },
  );
  typia.assert(feed);
  // 6. Validate the response
  TestValidator.predicate(
    "feed contains at least the created posts",
    feed.data.length >= postCount,
  );
  const feedPostIds = new Set(feed.data.map((p) => p.id));
  for (const post of posts) {
    TestValidator.predicate(
      `created post appears in home feed`,
      feedPostIds.has(post.id),
    );
  }
  for (const summary of feed.data) {
    TestValidator.predicate("feed post has title", summary.title.length > 0);
    TestValidator.predicate(
      "feed post has author username",
      summary.author.username.length > 0,
    );
    TestValidator.predicate(
      "feed post has community name",
      summary.community.name.length > 0,
    );
  }
}
