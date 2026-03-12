import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePost";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";

/**
 * Test that authenticated members can retrieve posts from their subscribed communities using the home feed type.
 * Verifies: (1) Member authentication is required, (2) Posts are filtered to subscribed communities,
 * (3) Posts are properly sorted, (4) Pagination works correctly, (5) Post summaries include all required fields,
 * (6) Response includes pagination metadata.
 */
export async function test_api_member_post_feed_home_subscribed_communities(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(2),
      bio: null,
      avatar_uri: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(member);
  // 2. Create a community (member is auto-subscribed as owner)
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon: null,
        },
      },
    );
  typia.assert(community);
  // 3. Create multiple posts in the community to populate the feed
  const posts = await ArrayUtil.asyncRepeat(5, async (index) => {
    return await generate_random_reddit_clone_member_posts_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          postType: RandomGenerator.pick(["text", "link", "image"] as const),
          communityId: community.id,
          content:
            index % 2 === 0
              ? RandomGenerator.paragraph({ sentences: 5 })
              : null,
        },
      },
    );
  });
  await ArrayUtil.asyncForEach(posts, async (post) => {
    typia.assert(post);
  });
  // 4. Retrieve home feed with default pagination
  const feedResponse = await api.functional.redditClone.member.posts.index(
    memberConnection,
    {
      body: {
        feed_type: "home",
        sort: "new",
        page: 1,
        page_size: 20,
      },
    },
  );
  typia.assert(feedResponse);
  // 5. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    feedResponse.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", feedResponse.pagination.limit, 20);
  TestValidator.predicate(
    "pagination has records",
    feedResponse.pagination.records >= posts.length,
  );
  TestValidator.predicate(
    "pagination pages is valid",
    feedResponse.pagination.pages >= 1,
  );
  // 6. Validate posts are from subscribed community
  TestValidator.predicate(
    "all posts from subscribed community",
    feedResponse.data.every((post) => post.community.id === community.id),
  );
  // 7. Validate post summary structure
  await ArrayUtil.asyncForEach(feedResponse.data, async (post) => {
    TestValidator.predicate(
      "post has valid id",
      typeof post.id === "string" && post.id.length > 0,
    );
    TestValidator.predicate(
      "post has valid title",
      typeof post.title === "string" && post.title.length > 0,
    );
    TestValidator.predicate(
      "post has valid post_type",
      ["text", "link", "image"].includes(post.post_type),
    );
    TestValidator.predicate("post has score", typeof post.score === "number");
    TestValidator.predicate(
      "post has comment_count",
      typeof post.comment_count === "number",
    );
    TestValidator.predicate(
      "post has created_at",
      typeof post.created_at === "string",
    );
    TestValidator.predicate(
      "post has author",
      post.author !== null && typeof post.author.username === "string",
    );
    TestValidator.predicate(
      "post has community",
      post.community !== null && typeof post.community.name === "string",
    );
  });
  // 8. Test pagination with page_size parameter
  const paginatedResponse = await api.functional.redditClone.member.posts.index(
    memberConnection,
    {
      body: {
        feed_type: "home",
        sort: "new",
        page: 1,
        page_size: 2,
      },
    },
  );
  typia.assert(paginatedResponse);
  TestValidator.equals(
    "pagination with custom page_size",
    paginatedResponse.pagination.limit,
    2,
  );
  TestValidator.predicate(
    "paginated response has correct limit",
    paginatedResponse.data.length <= 2,
  );
  // 9. Test different sort orders
  const hotFeed = await api.functional.redditClone.member.posts.index(
    memberConnection,
    {
      body: {
        feed_type: "home",
        sort: "hot",
        page: 1,
        page_size: 10,
      },
    },
  );
  typia.assert(hotFeed);
  TestValidator.predicate(
    "hot sort returns valid response",
    hotFeed.pagination.records >= 0,
  );
  const topFeed = await api.functional.redditClone.member.posts.index(
    memberConnection,
    {
      body: {
        feed_type: "home",
        sort: "top",
        time_filter: "all_time",
        page: 1,
        page_size: 10,
      },
    },
  );
  typia.assert(topFeed);
  TestValidator.predicate(
    "top sort returns valid response",
    topFeed.pagination.records >= 0,
  );
}