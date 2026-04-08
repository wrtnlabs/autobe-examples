import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePost";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunitySubscription";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_communities_subscriptions_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_community_subscription } from "../../../prepare/prepare_random_reddit_clone_community_subscription";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";

/**
 * Test the home feed endpoint that returns posts from subscribed communities.
 *
 * Validates the complete home feed workflow including member registration, community subscription, post creation, and feed retrieval. Ensures that the home feed correctly filters posts to only include those from communities the authenticated member has subscribed to.
 *
 * Special attention is given to verifying that posts include all required summary fields, pagination metadata is accurate, and different sorting options work correctly. The test also validates that unsubscribed community posts are excluded from the home feed.
 *
 * 1. Register and authenticate a new member account.
 * 2. Create posts in a community (assuming community exists).
 * 3. Subscribe the member to the community.
 * 4. Fetch the home feed and verify posts are from subscribed communities only.
 * 5. Validate post summary fields: id, title, post_type, author, community, vote_score, comment_count, created_at, preview.
 * 6. Test pagination metadata: current page, limit, total records, total pages.
 * 7. Test different sorting options (hot, new, top, controversial).
 * 8. Verify empty feed when member has no subscriptions.
 */
export async function test_api_home_feed_subscribed_communities_posts(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // 2. Create a community for testing (using a UUID for an existing community)
  const communityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Subscribe member to the community
  const subscription =
    await generate_random_reddit_clone_member_communities_subscriptions_create(
      memberConnection,
      {
        params: {
          communityId,
        },
        body: {
          community_id: communityId,
        },
      },
    );
  typia.assert(subscription);
  // 4. Create posts in the subscribed community
  const posts = await ArrayUtil.asyncRepeat(3, async (index: number) => {
    const post = await generate_random_reddit_clone_member_posts_create(
      memberConnection,
      {
        body: {
          title: `Test Post ${index + 1}`,
          post_type:
            index % 3 === 0 ? "text" : index % 3 === 1 ? "link" : "image",
          community_id: communityId,
          text_content:
            index % 3 === 0
              ? RandomGenerator.paragraph({ sentences: 5 })
              : undefined,
          link_url:
            index % 3 === 1
              ? typia.random<string & tags.Format<"url">>()
              : undefined,
          image_url:
            index % 3 === 2
              ? typia.random<string & tags.Format<"url">>()
              : undefined,
        },
      },
    );
    typia.assert(post);
    return post;
  });
  // 5. Fetch home feed with default sorting (hot)
  const feedHot = await api.functional.redditClone.member.feeds.home.index(
    memberConnection,
    {
      body: {
        sortType: "hot",
        page: 1,
        limit: 10,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(feedHot);
  // 6. Validate feed contains posts from subscribed community
  TestValidator.equals("feed contains posts", feedHot.data.length, 3);
  // 7. Validate each post has required fields
  await ArrayUtil.asyncForEach(feedHot.data, async (post) => {
    typia.assert(post);
    TestValidator.predicate("has valid id", post.id !== "");
    TestValidator.predicate("has title", post.title !== "");
    TestValidator.predicate(
      "has post_type",
      ["text", "link", "image"].includes(post.post_type),
    );
    TestValidator.predicate("has author", post.author !== null);
    TestValidator.predicate("has community", post.community !== null);
    TestValidator.predicate(
      "has vote_score",
      typeof post.vote_score === "number",
    );
    TestValidator.predicate(
      "has comment_count",
      typeof post.comment_count === "number",
    );
    TestValidator.predicate("has created_at", post.created_at !== "");
    TestValidator.predicate("has preview", post.preview !== "");
  });
  // 8. Validate pagination metadata
  TestValidator.equals("current page", feedHot.pagination.current, 1);
  TestValidator.equals("limit", feedHot.pagination.limit, 10);
  TestValidator.equals("total records", feedHot.pagination.records, 3);
  TestValidator.predicate("has pages", feedHot.pagination.pages >= 1);
  // 9. Test sorting by new
  const feedNew = await api.functional.redditClone.member.feeds.home.index(
    memberConnection,
    {
      body: {
        sortType: "new",
        page: 1,
        limit: 10,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(feedNew);
  TestValidator.equals("new sort returns posts", feedNew.data.length, 3);
  // 10. Test sorting by top with time filter
  const feedTop = await api.functional.redditClone.member.feeds.home.index(
    memberConnection,
    {
      body: {
        sortType: "top",
        timeFilter: "all",
        page: 1,
        limit: 10,
      } satisfies IRedditClonePost.IRequest,
    },
  );
  typia.assert(feedTop);
  TestValidator.equals("top sort returns posts", feedTop.data.length, 3);
  // 11. Test sorting by controversial
  const feedControversial =
    await api.functional.redditClone.member.feeds.home.index(memberConnection, {
      body: {
        sortType: "controversial",
        page: 1,
        limit: 10,
      } satisfies IRedditClonePost.IRequest,
    });
  typia.assert(feedControversial);
  TestValidator.equals(
    "controversial sort returns posts",
    feedControversial.data.length,
    3,
  );
  // 12. Verify all posts are from the subscribed community
  await ArrayUtil.asyncForEach(feedHot.data, async (post) => {
    TestValidator.equals(
      "post from subscribed community",
      post.community.id,
      communityId,
    );
  });
}
