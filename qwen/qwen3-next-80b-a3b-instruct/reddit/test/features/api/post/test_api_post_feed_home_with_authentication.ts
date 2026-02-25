import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
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
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";

export async function test_api_post_feed_home_with_authentication(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated member connection
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(member);
  // 2. Create a new community
  const communityConnection: api.IConnection = { host: connection.host };
  communityConnection.headers = memberConnection.headers; // Use same auth token
  const community =
    await generate_random_reddit_community_member_communities_create(
      communityConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Subscribe member to the community
  const subscribeConnection: api.IConnection = { host: connection.host };
  subscribeConnection.headers = memberConnection.headers;
  const subscription =
    await api.functional.redditCommunity.member.communities.subscribe.create(
      subscribeConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(subscription);
  TestValidator.equals(
    "member subscribed to community",
    subscription.community_id,
    community.id,
  );
  // 4. Create a post in the subscribed community
  const postConnection: api.IConnection = { host: connection.host };
  postConnection.headers = memberConnection.headers;
  const post = await generate_random_reddit_community_member_posts_create(
    postConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_id: community.id,
        content: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Call the feed home API with sort='hot' and timeFilter='week'
  const feedConnection: api.IConnection = { host: connection.host };
  feedConnection.headers = memberConnection.headers;
  const feedResponse = await api.functional.redditCommunity.posts.index(
    feedConnection,
    {
      body: {
        sort: "hot",
        timeFilter: "week",
      } satisfies IRedditCommunityPost.IRequest,
    },
  );
  typia.assert(feedResponse);
  // 6. Validate the response
  // All posts should be from subscribed communities
  const subscribedCommunityIds = [community.id];
  for (const post of feedResponse.data) {
    TestValidator.predicate(
      "post from subscribed community",
      subscribedCommunityIds.includes(post.community.id),
    );
  }
  // Validation of pagination metadata
  TestValidator.predicate(
    "pagination current >= 1",
    feedResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit > 0",
    feedResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    feedResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    feedResponse.pagination.pages >= 0,
  );
  // Confirm we have at least one post
  TestValidator.predicate(
    "at least one post returned",
    feedResponse.data.length > 0,
  );
  // Validate post summary structure
  for (const post of feedResponse.data) {
    TestValidator.equals("post has id", typeof post.id, "string");
    TestValidator.equals("post has title", typeof post.title, "string");
    TestValidator.equals(
      "post has vote score",
      typeof post.vote_score,
      "number",
    );
    TestValidator.equals(
      "post has comment count",
      typeof post.comment_count,
      "number",
    );
    TestValidator.equals(
      "post has created_at",
      typeof post.created_at,
      "string",
    );
    TestValidator.equals(
      "post has updated_at",
      typeof post.updated_at,
      "string",
    );
    TestValidator.equals(
      "post has community id",
      typeof post.community.id,
      "string",
    );
    TestValidator.equals(
      "post has community name",
      typeof post.community.name,
      "string",
    );
    TestValidator.equals("post has author id", typeof post.author.id, "string");
    TestValidator.equals(
      "post has author username",
      typeof post.author.username,
      "string",
    );
  }
}
