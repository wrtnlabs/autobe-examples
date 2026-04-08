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
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_posts_create } from "../../../generate/generate_random_reddit_community_posts_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";

/**
 * Test community feed posts sorted by newest first with comprehensive validation.
 *
 * Validates the complete community feed retrieval workflow including member authentication, community creation, multi-type post creation, chronological sorting verification, and public access confirmation. Ensures that posts are returned in descending chronological order (most recent first) with all required metadata fields properly populated.
 *
 * Special attention is given to verifying type-specific preview content: text_preview for text posts, thumbnail_url for image posts, and link_domain for link posts. Also validates that both authenticated members and guest users can access public community feeds.
 *
 * 1. Member registers with email and credentials, creates a community.
 * 2. Member creates three posts with different types (text, link, image) with controlled creation order.
 * 3. Fetches community feed with sort='new' as authenticated member.
 * 4. Validates posts are sorted by created_at descending (newest first).
 * 5. Validates type-specific preview content is correctly populated for each post type.
 * 6. Fetches community feed as guest user (new connection without authentication).
 * 7. Validates guest receives same sorted results confirming public access.
 */
export async function test_api_community_feed_new_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and community creation
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(member);
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 2. Create multiple posts with different types in specific order
  // First post (oldest) - text type
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
  // Wait briefly to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 10));
  // Second post (middle) - link type
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
  // Wait briefly to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 10));
  // Third post (newest) - image type
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
  // 3. Fetch community feed with sort='new' as authenticated member
  const memberFeed = await api.functional.redditCommunity.feeds.community.index(
    memberConnection,
    {
      communityId: community.id,
      body: {
        sort: "new",
        limit: 10,
      } satisfies IRedditCommunityPost.IRequest,
    },
  );
  typia.assert(memberFeed);
  // 4. Validate posts are sorted by created_at descending (newest first)
  TestValidator.predicate("posts sorted newest first", () => {
    if (memberFeed.data.length < 2) return true;
    for (let i = 0; i < memberFeed.data.length - 1; i++) {
      const current = new Date(memberFeed.data[i].created_at).getTime();
      const next = new Date(memberFeed.data[i + 1].created_at).getTime();
      if (current < next) return false;
    }
    return true;
  });
  // 5. Validate type-specific preview content for each post type
  const textPosts = memberFeed.data.filter((p) => p.post_type === "text");
  const linkPosts = memberFeed.data.filter((p) => p.post_type === "link");
  const imagePosts = memberFeed.data.filter((p) => p.post_type === "image");
  for (const post of textPosts) {
    TestValidator.predicate(
      "text post has text_preview",
      () => post.text_preview !== null && post.text_preview !== undefined,
    );
  }
  for (const post of imagePosts) {
    TestValidator.predicate(
      "image post has thumbnail_url",
      () => post.thumbnail_url !== null && post.thumbnail_url !== undefined,
    );
  }
  for (const post of linkPosts) {
    TestValidator.predicate(
      "link post has link_domain",
      () => post.link_domain !== null && post.link_domain !== undefined,
    );
  }
  // 6. Fetch community feed as guest (new connection without auth)
  const guestConnection: api.IConnection = { host: connection.host };
  const guestFeed = await api.functional.redditCommunity.feeds.community.index(
    guestConnection,
    {
      communityId: community.id,
      body: {
        sort: "new",
        limit: 10,
      } satisfies IRedditCommunityPost.IRequest,
    },
  );
  typia.assert(guestFeed);
  // 7. Validate guest receives same sorted results and post count
  TestValidator.equals(
    "guest feed post count",
    guestFeed.data.length,
    memberFeed.data.length,
  );
  TestValidator.predicate("guest feed sorted newest first", () => {
    if (guestFeed.data.length < 2) return true;
    for (let i = 0; i < guestFeed.data.length - 1; i++) {
      const current = new Date(guestFeed.data[i].created_at).getTime();
      const next = new Date(guestFeed.data[i + 1].created_at).getTime();
      if (current < next) return false;
    }
    return true;
  });
  // Validate all posts from member feed appear in guest feed
  TestValidator.predicate("all posts visible to guest", () => {
    const memberIds = new Set(memberFeed.data.map((p) => p.id));
    const guestIds = new Set(guestFeed.data.map((p) => p.id));
    if (memberIds.size !== guestIds.size) return false;
    for (const id of memberIds) {
      if (!guestIds.has(id)) return false;
    }
    return true;
  });
}