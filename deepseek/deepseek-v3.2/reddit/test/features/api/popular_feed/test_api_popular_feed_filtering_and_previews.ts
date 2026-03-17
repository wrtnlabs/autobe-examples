import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostAttachment";
import type { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import type { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_posts_links_create } from "../../../generate/generate_random_community_platform_member_posts_links_create";
import { generate_random_community_platform_member_posts_texts_create } from "../../../generate/generate_random_community_platform_member_posts_texts_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_attachment } from "../../../prepare/prepare_random_community_platform_post_attachment";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";
import { prepare_random_community_platform_post_text } from "../../../prepare/prepare_random_community_platform_post_text";

export async function test_api_popular_feed_filtering_and_previews(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create multiple members for different authors
  const memberConnections: api.IConnection[] = await Promise.all(
    ArrayUtil.repeat(3, () => {
      const memberConnection: api.IConnection = { host: connection.host };
      return authorize_member_join(memberConnection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: "password123",
          username: RandomGenerator.alphaNumeric(12),
          href: "https://example.com",
          referrer: "https://example.com",
          ip: "127.0.0.1",
        } satisfies ICommunityPlatformMember.IJoin,
      }).then(() => memberConnection);
    }),
  );
  // 2. Create communities for filtering
  const communities = await Promise.all(
    memberConnections.slice(0, 2).map(async (memberConnection) => {
      const community =
        await generate_random_community_platform_member_communities_create(
          memberConnection,
          {
            body: {
              name: RandomGenerator.alphaNumeric(8).toLowerCase(),
              description: RandomGenerator.paragraph({ sentences: 2 }),
            },
          },
        );
      typia.assert(community);
      return community;
    }),
  );
  const community1 = communities[0];
  const community2 = communities[1];
  // 3. Create diverse posts with different content types, authors, and times
  const posts: ICommunityPlatformPost[] = [];
  const postAuthors: string[] = []; // Store author IDs
  const postCommunities: string[] = []; // Store community IDs
  // TEXT posts for author 0 in community 1
  for (let i = 0; i < 2; i++) {
    const post = await generate_random_community_platform_member_posts_create(
      memberConnections[0],
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          community_name: community1.name,
          content_type: "TEXT" as const,
          content_text: {
            content: RandomGenerator.content({
              paragraphs: 1,
              sentenceMin: 5,
              sentenceMax: 8,
            }),
            formatting: "plain",
          },
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
    typia.assert(post);
    posts.push(post);
    postAuthors.push(post.author.id);
    postCommunities.push(post.community.id);
    // Add text content
    await generate_random_community_platform_member_posts_texts_create(
      memberConnections[0],
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.content({ paragraphs: 3 }),
          formatting: "plain",
        } satisfies ICommunityPlatformPostText.ICreate,
      },
    );
  }
  // LINK posts for author 1 in community 1
  for (let i = 0; i < 2; i++) {
    const post = await generate_random_community_platform_member_posts_create(
      memberConnections[1],
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          community_name: community1.name,
          content_type: "LINK" as const,
          content_link: {
            url: `https://${RandomGenerator.alphaNumeric(6)}.com/example`,
            title: RandomGenerator.paragraph({ sentences: 1 }),
            description: RandomGenerator.paragraph({ sentences: 2 }),
          },
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
    typia.assert(post);
    posts.push(post);
    postAuthors.push(post.author.id);
    postCommunities.push(post.community.id);
    // Add link content
    await generate_random_community_platform_member_posts_links_create(
      memberConnections[1],
      {
        params: { postId: post.id },
        body: {
          url: `https://${RandomGenerator.alphaNumeric(6)}.com/path${i}`,
          title: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformPostLink.ICreate,
      },
    );
  }
  // IMAGE posts for author 2 in community 2 (different community)
  for (let i = 0; i < 2; i++) {
    const post = await generate_random_community_platform_member_posts_create(
      memberConnections[2],
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          community_name: community2.name,
          content_type: "IMAGE" as const,
          content_attachment: {
            position: 0,
            file_type: "image",
            original_filename: `image${i}.jpg`,
            file_size: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1000>
            >(),
            mime_type: "image/jpeg",
            community_platform_file_id: typia.random<
              string & tags.Format<"uuid">
            >(),
          } satisfies ICommunityPlatformPostAttachment.ICreate,
        },
      },
    );
    typia.assert(post);
    posts.push(post);
    postAuthors.push(post.author.id);
    postCommunities.push(post.community.id);
  }
  // Wait a moment for timestamp differences
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 4. Test community filtering
  const communityFiltered =
    await api.functional.communityPlatform.popular_feed.index(connection, {
      body: {
        sort: "new" as const,
        community_id: community1.id,
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(communityFiltered);
  TestValidator.equals(
    "community filter returns only posts from specified community",
    communityFiltered.data.every((post) => post.community.id === community1.id),
    true,
  );
  TestValidator.equals(
    "community filter excludes posts from other communities",
    communityFiltered.data.some((post) => post.community.id === community2.id),
    false,
  );
  // 5. Test author filtering
  const authorFiltered =
    await api.functional.communityPlatform.popular_feed.index(connection, {
      body: {
        sort: "new" as const,
        author_id: postAuthors[0],
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(authorFiltered);
  TestValidator.equals(
    "author filter returns only posts by specified author",
    authorFiltered.data.every((post) => post.author.id === postAuthors[0]),
    true,
  );
  // 6. Test content type filtering - TEXT
  const textFiltered =
    await api.functional.communityPlatform.popular_feed.index(connection, {
      body: {
        sort: "new" as const,
        content_type: "TEXT" as const,
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(textFiltered);
  TestValidator.equals(
    "content_type TEXT filter returns only TEXT posts",
    textFiltered.data.every((post) => {
      // Check if content_preview looks like text (not domain, not URL)
      const preview = post.content_preview;
      return (
        preview.length > 0 &&
        !preview.includes(".com") &&
        !preview.includes("http")
      );
    }),
    true,
  );
  // 7. Test content type filtering - LINK
  const linkFiltered =
    await api.functional.communityPlatform.popular_feed.index(connection, {
      body: {
        sort: "new" as const,
        content_type: "LINK" as const,
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(linkFiltered);
  TestValidator.equals(
    "content_type LINK filter returns only LINK posts",
    linkFiltered.data.every((post) => {
      // LINK posts should have domain-like previews
      const preview = post.content_preview;
      return (
        preview.includes(".com") ||
        preview.includes(".org") ||
        preview.includes(".net")
      );
    }),
    true,
  );
  // 8. Test content preview generation
  const allPosts = await api.functional.communityPlatform.popular_feed.index(
    connection,
    {
      body: {
        sort: "new" as const,
        page: 1,
        limit: 20,
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(allPosts);
  // Verify content previews for different post types
  for (const post of allPosts.data) {
    // Each post should have a non-empty content_preview
    TestValidator.predicate(
      `post ${post.id} has content preview`,
      post.content_preview.length > 0,
    );
    // Content preview should not exceed expected length for text posts
    if (!post.content_preview.includes(".com")) {
      TestValidator.predicate(
        `text post ${post.id} preview reasonable length`,
        post.content_preview.length <= 250,
      );
    }
  }
  // 9. Test date range filtering
  // Get creation time of first post
  const firstPostTime = posts[0].created_at;
  // Create a later timestamp
  const laterTime = new Date(Date.now() + 1000).toISOString();
  const dateFiltered =
    await api.functional.communityPlatform.popular_feed.index(connection, {
      body: {
        sort: "new" as const,
        created_at_start: firstPostTime,
        created_at_end: laterTime,
        page: 1,
        limit: 20,
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(dateFiltered);
  TestValidator.predicate(
    "date range filter returns posts within time range",
    dateFiltered.data.length > 0,
  );
  // 10. Test combined filters
  const combinedFiltered =
    await api.functional.communityPlatform.popular_feed.index(connection, {
      body: {
        sort: "new" as const,
        community_id: community1.id,
        content_type: "TEXT" as const,
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(combinedFiltered);
  TestValidator.equals(
    "combined filter (community + content_type) returns correct posts",
    combinedFiltered.data.every(
      (post) =>
        post.community.id === community1.id &&
        !post.content_preview.includes(".com") &&
        !post.content_preview.includes("http"),
    ),
    true,
  );
}
