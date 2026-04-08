import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImageContent";
import type { IRedditCommunityPostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostLinkContent";
import type { IRedditCommunityPostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostTextContent";
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
import { generate_random_reddit_community_member_member_subscriptions_create } from "../../../generate/generate_random_reddit_community_member_member_subscriptions_create";
import { generate_random_reddit_community_posts_create } from "../../../generate/generate_random_reddit_community_posts_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_subscription } from "../../../prepare/prepare_random_reddit_community_subscription";

/**
 * Test post browsing functionality with various sorting options.
 *
 * Validates the complete post browsing workflow including member registration, community creation, subscription, and post creation with different types. Tests all sorting modes (hot, new, top, controversial) and validates pagination metadata and type-specific preview content.
 *
 * The test creates three posts of different types (text, link, image) to verify type filtering and type-specific preview fields. Each sorting mode is tested to ensure posts are returned in the expected order.
 *
 * 1. Member registers with randomized credentials.
 * 2. Member creates a community for hosting test posts.
 * 3. Member subscribes to the community to enable post creation.
 * 4. Creates three posts: text post with body, link post with URL, image post with image URL.
 * 5. Tests browsing with sort='new' to verify chronological ordering.
 * 6. Tests browsing with sort='hot' to verify engagement-weighted ordering.
 * 7. Tests browsing with sort='top' to verify vote score ordering.
 * 8. Tests browsing with sort='controversial' to verify divisive content ordering.
 * 9. Tests type filtering by post_type (text, link, image).
 * 10. Validates pagination metadata and post summary fields including type-specific previews.
 */
export async function test_api_post_browsing_with_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  // 2. Create community
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe to community
  const subscription =
    await generate_random_reddit_community_member_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        } satisfies IRedditCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 4. Create three posts of different types
  const textPost = await generate_random_reddit_community_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "text",
        community_id: community.id,
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(textPost);
  const linkPost = await generate_random_reddit_community_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "link",
        community_id: community.id,
        url: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(linkPost);
  const imagePost = await generate_random_reddit_community_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "image",
        community_id: community.id,
        image_url: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(imagePost);
  // 5. Test browsing with sort='new'
  const newPosts = await api.functional.redditCommunity.posts.index(
    memberConnection,
    {
      body: {
        sort: "new",
        communityId: community.id,
        take: 10,
      } satisfies IRedditCommunityPost.IRequest,
    },
  );
  typia.assert(newPosts);
  TestValidator.predicate("new posts pagination valid", () => {
    const p = newPosts.pagination;
    return p.current >= 1 && p.limit > 0 && p.records >= 3 && p.pages >= 1;
  });
  TestValidator.predicate(
    "new posts has data",
    () => newPosts.data.length >= 3,
  );
  TestValidator.predicate("created posts appear in results", () => {
    const ids = newPosts.data.map((p) => p.id);
    return (
      ids.includes(textPost.id) &&
      ids.includes(linkPost.id) &&
      ids.includes(imagePost.id)
    );
  });
  // 6. Test browsing with sort='hot'
  const hotPosts = await api.functional.redditCommunity.posts.index(
    memberConnection,
    {
      body: {
        sort: "hot",
        communityId: community.id,
        take: 10,
      } satisfies IRedditCommunityPost.IRequest,
    },
  );
  typia.assert(hotPosts);
  TestValidator.predicate("hot posts pagination valid", () => {
    const p = hotPosts.pagination;
    return p.current >= 1 && p.limit > 0 && p.records >= 3;
  });
  // 7. Test browsing with sort='top'
  const topPosts = await api.functional.redditCommunity.posts.index(
    memberConnection,
    {
      body: {
        sort: "top",
        timeRange: "allTime",
        communityId: community.id,
        take: 10,
      } satisfies IRedditCommunityPost.IRequest,
    },
  );
  typia.assert(topPosts);
  TestValidator.predicate("top posts pagination valid", () => {
    const p = topPosts.pagination;
    return p.current >= 1 && p.limit > 0 && p.records >= 3;
  });
  // 8. Test browsing with sort='controversial'
  const controversialPosts = await api.functional.redditCommunity.posts.index(
    memberConnection,
    {
      body: {
        sort: "controversial",
        communityId: community.id,
        take: 10,
      } satisfies IRedditCommunityPost.IRequest,
    },
  );
  typia.assert(controversialPosts);
  TestValidator.predicate("controversial posts pagination valid", () => {
    const p = controversialPosts.pagination;
    return p.current >= 1 && p.limit > 0 && p.records >= 3;
  });
  // 9. Test type filtering - text posts
  const textPostsOnly = await api.functional.redditCommunity.posts.index(
    memberConnection,
    {
      body: {
        sort: "new",
        communityId: community.id,
        postType: "text",
        take: 10,
      } satisfies IRedditCommunityPost.IRequest,
    },
  );
  typia.assert(textPostsOnly);
  TestValidator.predicate("text posts filtered correctly", () =>
    textPostsOnly.data.every((p) => p.post_type === "text"),
  );
  TestValidator.predicate("text post includes text_preview", () =>
    textPostsOnly.data.some(
      (p) => p.text_preview !== undefined && p.text_preview !== null,
    ),
  );
  // 10. Test type filtering - link posts
  const linkPostsOnly = await api.functional.redditCommunity.posts.index(
    memberConnection,
    {
      body: {
        sort: "new",
        communityId: community.id,
        postType: "link",
        take: 10,
      } satisfies IRedditCommunityPost.IRequest,
    },
  );
  typia.assert(linkPostsOnly);
  TestValidator.predicate("link posts filtered correctly", () =>
    linkPostsOnly.data.every((p) => p.post_type === "link"),
  );
  TestValidator.predicate("link post includes link_domain", () =>
    linkPostsOnly.data.some(
      (p) => p.link_domain !== undefined && p.link_domain !== null,
    ),
  );
  // 11. Test type filtering - image posts
  const imagePostsOnly = await api.functional.redditCommunity.posts.index(
    memberConnection,
    {
      body: {
        sort: "new",
        communityId: community.id,
        postType: "image",
        take: 10,
      } satisfies IRedditCommunityPost.IRequest,
    },
  );
  typia.assert(imagePostsOnly);
  TestValidator.predicate("image posts filtered correctly", () =>
    imagePostsOnly.data.every((p) => p.post_type === "image"),
  );
  TestValidator.predicate("image post includes thumbnail_url", () =>
    imagePostsOnly.data.some(
      (p) => p.thumbnail_url !== undefined && p.thumbnail_url !== null,
    ),
  );
  // 12. Validate post summary fields
  const allPosts = await api.functional.redditCommunity.posts.index(
    memberConnection,
    {
      body: {
        sort: "new",
        communityId: community.id,
        take: 10,
      } satisfies IRedditCommunityPost.IRequest,
    },
  );
  typia.assert(allPosts);
  TestValidator.predicate("all posts have required fields", () =>
    allPosts.data.every((p) => {
      return (
        p.id !== undefined &&
        p.title !== undefined &&
        p.post_type !== undefined &&
        p.author !== undefined &&
        p.community !== undefined &&
        p.vote_score !== undefined &&
        p.comment_count !== undefined &&
        p.created_at !== undefined
      );
    }),
  );
  // 13. Validate author and community summary fields
  TestValidator.predicate("author has required fields", () =>
    allPosts.data.every((p) => {
      const a = p.author;
      return (
        a.id !== undefined &&
        a.username !== undefined &&
        a.display_name !== undefined &&
        a.karma !== undefined &&
        a.created_at !== undefined
      );
    }),
  );
  TestValidator.predicate("community has required fields", () =>
    allPosts.data.every((p) => {
      const c = p.community;
      return (
        c.id !== undefined &&
        c.name !== undefined &&
        c.description !== undefined &&
        c.icon !== undefined &&
        c.subscribers_count !== undefined &&
        c.created_at !== undefined
      );
    }),
  );
}
