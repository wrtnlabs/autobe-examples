import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikePost";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikeSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";

export async function test_api_member_community_feed_success_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create community first, then member and subscribe
  const communityName = `community_${RandomGenerator.alphaNumeric(6)}`;
  // Create member and join community
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await api.functional.redditLike.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(8),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        bio: null,
        avatar_url: null,
      } satisfies IRedditLikeMember.IJoin,
    },
  );
  typia.assert(member);
  // Subscribe to the community
  const subscription =
    await api.functional.redditLike.member.communities.subscribe.create(
      memberConnection,
      {
        communityName: communityName,
      },
    );
  typia.assert(subscription);
  // 2. Create multiple test posts with varied initial scores
  const posts = await ArrayUtil.asyncRepeat(4, async (index) => {
    const postBody = {
      title: `Test Post ${index + 1}`,
      type: "text" as const,
      content: RandomGenerator.paragraph({ sentences: 2 }),
      community_id: subscription.community.id,
    } satisfies IRedditLikePost.ICreate;
    const post = await api.functional.redditLike.member.posts.create(
      memberConnection,
      {
        body: postBody,
      },
    );
    typia.assert(post);
    return post;
  });
  // 3. Test default parameters
  const defaultFeed =
    await api.functional.redditLike.member.communities.feed.search(
      memberConnection,
      {
        communityName: communityName,
        body: {},
      },
    );
  typia.assert(defaultFeed);
  TestValidator.predicate("has posts", defaultFeed.data.length > 0);
  TestValidator.predicate(
    "pagination current >= 1",
    defaultFeed.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit in range",
    defaultFeed.pagination.limit >= 1 && defaultFeed.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    defaultFeed.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    defaultFeed.pagination.pages >= 0,
  );
  // 4. Test sort=new
  const newFeed =
    await api.functional.redditLike.member.communities.feed.search(
      memberConnection,
      {
        communityName: communityName,
        body: { sort: "new" },
      },
    );
  typia.assert(newFeed);
  TestValidator.predicate("new feed has posts", newFeed.data.length > 0);
  // 5. Test sort=hot
  const hotFeed =
    await api.functional.redditLike.member.communities.feed.search(
      memberConnection,
      {
        communityName: communityName,
        body: { sort: "hot" },
      },
    );
  typia.assert(hotFeed);
  TestValidator.predicate("hot feed has posts", hotFeed.data.length > 0);
  // 6. Test sort=top
  const topFeed =
    await api.functional.redditLike.member.communities.feed.search(
      memberConnection,
      {
        communityName: communityName,
        body: { sort: "top" },
      },
    );
  typia.assert(topFeed);
  TestValidator.predicate("top feed has posts", topFeed.data.length > 0);
  // 7. Test sort=controversial
  const controversialFeed =
    await api.functional.redditLike.member.communities.feed.search(
      memberConnection,
      {
        communityName: communityName,
        body: { sort: "controversial" },
      },
    );
  typia.assert(controversialFeed);
  TestValidator.predicate(
    "controversial feed has posts",
    controversialFeed.data.length > 0,
  );
  // 8. Verify post summary structure
  for (const feed of [
    defaultFeed,
    newFeed,
    hotFeed,
    topFeed,
    controversialFeed,
  ]) {
    TestValidator.equals(
      "correct pagination structure",
      typeof feed.pagination.current,
      "number",
    );
    TestValidator.equals(
      "correct pagination limit",
      typeof feed.pagination.limit,
      "number",
    );
    TestValidator.equals(
      "correct pagination records",
      typeof feed.pagination.records,
      "number",
    );
    TestValidator.equals(
      "correct pagination pages",
      typeof feed.pagination.pages,
      "number",
    );
    for (const post of feed.data) {
      typia.assert(post);
      TestValidator.equals("has id", typeof post.id, "string");
      TestValidator.equals("has title", typeof post.title, "string");
      TestValidator.equals(
        "has author",
        typeof post.author === "object" && post.author !== null,
        true,
      );
      TestValidator.equals(
        "has community",
        typeof post.community === "object" && post.community !== null,
        true,
      );
      TestValidator.equals("has score", typeof post.score === "number", true);
      TestValidator.equals(
        "has comment_count",
        typeof post.comment_count === "number",
        true,
      );
      TestValidator.equals(
        "has created_at",
        typeof post.created_at === "string",
        true,
      );
    }
  }
}
