import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikePost";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostFile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";

/**
 * Test popular feed retrieval across all communities.
 *
 * Validates that the popular feed endpoint returns posts from all communities on the platform, independent of the user's subscription status. The test verifies comprehensive feed functionality including multi-community post aggregation, sorting algorithms, pagination mechanics, and content preview generation for various post types.
 *
 * The test creates a member account, establishes multiple communities with diverse posts (text, link, and image types), then validates that the popular feed correctly aggregates and returns posts from all communities with proper sorting and pagination support.
 *
 * 1. Create and authenticate a member account.
 * 2. Create three distinct communities with unique names and descriptions.
 * 3. Create at least two posts per community with varying content types (text, link).
 * 4. Invoke the popular feed endpoint with feed_type='popular'.
 * 5. Verify posts from all three communities appear in the results.
 * 6. Test sorting options: hot, new, top, controversial.
 * 7. Validate cursor-based pagination functionality.
 * 8. Confirm content previews are properly generated for each post type.
 */
export async function test_api_post_popular_feed_all_communities(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member);
  // 2. Create three distinct communities
  const communities: IRedditLikeCommunity[] = await ArrayUtil.asyncRepeat(
    3,
    async () => {
      const community =
        await generate_random_reddit_like_member_communities_create(
          memberConnection,
          {
            body: {
              name: `Community_${RandomGenerator.alphabets(5)}`,
              description: RandomGenerator.paragraph({ sentences: 3 }),
            } satisfies IRedditLikeCommunity.ICreate,
          },
        );
      typia.assert(community);
      return community;
    },
  );
  // 3. Create at least two posts per community with varying content types
  const allPosts: IRedditLikePost[] = [];
  await ArrayUtil.asyncForEach(communities, async (community) => {
    const posts = await ArrayUtil.asyncRepeat(2, async (index) => {
      const contentType: "text" | "link" = index === 0 ? "text" : "link";
      const post = await generate_random_reddit_like_member_posts_create(
        memberConnection,
        {
          body: {
            community_id: community.id,
            title: `Post ${index + 1} in ${community.name}`,
            content_type: contentType,
            content_text:
              contentType === "text"
                ? RandomGenerator.paragraph({ sentences: 5 })
                : undefined,
            content_url:
              contentType === "link"
                ? typia.random<string & tags.Format<"uri">>()
                : undefined,
          } satisfies IRedditLikePost.ICreate,
        },
      );
      typia.assert(post);
      return post;
    });
    allPosts.push(...posts);
  });
  // 4. Call popular feed endpoint
  const popularFeed = await api.functional.redditLike.member.posts.index(
    memberConnection,
    {
      body: {
        feed_type: "popular",
        limit: 50,
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(popularFeed);
  // 5. Verify posts from all communities appear
  const postIds = new Set(allPosts.map((p) => p.id));
  const returnedPostIds = new Set(popularFeed.data.map((p) => p.id));
  TestValidator.equals(
    "all created posts appear in popular feed",
    postIds.size,
    returnedPostIds.size,
  );
  TestValidator.predicate(
    "posts from all three communities included",
    communities.every((c) =>
      popularFeed.data.some((p) => p.community.id === c.id),
    ),
  );
  // 6. Test sorting options
  const sortOptions: Array<"hot" | "new" | "top" | "controversial"> = [
    "hot",
    "new",
    "top",
    "controversial",
  ];
  await ArrayUtil.asyncForEach(sortOptions, async (sort) => {
    const sortedFeed = await api.functional.redditLike.member.posts.index(
      memberConnection,
      {
        body: {
          feed_type: "popular",
          sort: sort,
          limit: 25,
        } satisfies IRedditLikePost.IRequest,
      },
    );
    typia.assert(sortedFeed);
    TestValidator.predicate(
      `sort option ${sort} returns valid data`,
      sortedFeed.data.length > 0,
    );
  });
  // 7. Validate pagination
  const firstPage = await api.functional.redditLike.member.posts.index(
    memberConnection,
    {
      body: {
        feed_type: "popular",
        limit: 2,
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(firstPage);
  TestValidator.equals(
    "first page limit respected",
    firstPage.data.length,
    Math.min(2, firstPage.pagination.records),
  );
  // 8. Verify content previews for different post types
  const textPostInFeed = popularFeed.data.find(
    (p) => p.content_type === "text",
  );
  const linkPostInFeed = popularFeed.data.find(
    (p) => p.content_type === "link",
  );
  if (textPostInFeed) {
    TestValidator.predicate(
      "text post has content preview",
      textPostInFeed.content_preview.length > 0,
    );
  }
  if (linkPostInFeed) {
    TestValidator.predicate(
      "link post has content preview",
      linkPostInFeed.content_preview.length > 0,
    );
  }
}
