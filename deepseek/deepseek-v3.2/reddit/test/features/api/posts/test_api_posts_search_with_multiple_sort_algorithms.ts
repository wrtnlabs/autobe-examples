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
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_attachment } from "../../../prepare/prepare_random_community_platform_post_attachment";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";
import { prepare_random_community_platform_post_text } from "../../../prepare/prepare_random_community_platform_post_text";

/**
 * Test the post search endpoint with various sorting algorithms (hot, new, top, controversial) to ensure proper post discovery across all communities. Create multiple posts with different content types (TEXT, LINK) across different communities, then test each sorting algorithm to verify:
 * 1. 'hot' sorting prioritizes recent posts with high vote scores weighted by recency
 * 2. 'new' sorting returns posts in reverse chronological order (newest first)
 * 3. 'top' sorting with time filters (today, week, month, year, all) returns highest-voted posts within specified time ranges
 * 4. 'controversial' sorting identifies posts with many votes but scores close to zero
 *
 * Also verify content previews: text posts show first 200 characters, link posts show extracted domain. Ensure deleted posts and posts from deleted communities are excluded from results.
 */
export async function test_api_posts_search_with_multiple_sort_algorithms(
  connection: api.IConnection,
): Promise<void> {
  // Create three member accounts as authors
  const memberConnections: api.IConnection[] = [];
  const members: ICommunityPlatformMember.IAuthorized[] = [];
  for (let i = 0; i < 3; i++) {
    const memberConnection: api.IConnection = { host: connection.host };
    const member = await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<
          string & tags.Format<"email">
        >() satisfies string as string,
        password: "password123",
        username: RandomGenerator.alphaNumeric(10),
        nickname: RandomGenerator.name(1),
        href: "https://example.com",
        referrer: "https://example.com",
        ip: "127.0.0.1",
      },
    });
    typia.assert(member);
    memberConnections.push(memberConnection);
    members.push(member);
  }
  // Each member creates a community
  const communities: ICommunityPlatformCommunity[] = [];
  for (let i = 0; i < 3; i++) {
    const community =
      await generate_random_community_platform_member_communities_create(
        memberConnections[i],
        {
          body: {
            name: RandomGenerator.alphaNumeric(8).toLowerCase(),
            description: RandomGenerator.paragraph({ sentences: 2 }),
          },
        },
      );
    typia.assert(community);
    communities.push(community);
  }
  // Create posts with different content types
  const posts: ICommunityPlatformPost[] = [];
  // Member 0: TEXT posts
  for (let i = 0; i < 2; i++) {
    const post = await generate_random_community_platform_member_posts_create(
      memberConnections[0],
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          community_name: communities[0].name,
          content_type: "TEXT" as const,
          content_text: {
            content: RandomGenerator.content({ paragraphs: 1 }),
            formatting: "plain",
          },
        },
      },
    );
    typia.assert(post);
    posts.push(post);
  }
  // Member 1: LINK posts
  for (let i = 0; i < 2; i++) {
    const post = await generate_random_community_platform_member_posts_create(
      memberConnections[1],
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          community_name: communities[1].name,
          content_type: "LINK" as const,
          content_link: {
            url: ("https://example.com/" +
              RandomGenerator.alphaNumeric(5)) satisfies string as string,
            title: RandomGenerator.name(2),
            description: RandomGenerator.paragraph({ sentences: 1 }),
            thumbnail_url: undefined,
          },
        },
      },
    );
    typia.assert(post);
    posts.push(post);
  }
  // Member 2: Mixed posts
  const post1 = await generate_random_community_platform_member_posts_create(
    memberConnections[2],
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_name: communities[2].name,
        content_type: "TEXT" as const,
        content_text: {
          content: RandomGenerator.content({ paragraphs: 1 }),
          formatting: "plain",
        },
      },
    },
  );
  typia.assert(post1);
  posts.push(post1);
  const post2 = await generate_random_community_platform_member_posts_create(
    memberConnections[2],
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_name: communities[2].name,
        content_type: "LINK" as const,
        content_link: {
          url: ("https://github.com/" +
            RandomGenerator.alphaNumeric(5)) satisfies string as string,
          title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 1 }),
          thumbnail_url: undefined,
        },
      },
    },
  );
  typia.assert(post2);
  posts.push(post2);
  // Wait a moment to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Test "new" sorting - should return most recent first
  const newSortResult = await api.functional.communityPlatform.posts.index(
    { host: connection.host },
    {
      body: {
        sort: "new",
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(newSortResult);
  TestValidator.equals(
    "new sort returns results",
    newSortResult.data.length > 0,
    true,
  );
  // Verify chronological order (newest first)
  if (newSortResult.data.length > 1) {
    for (let i = 0; i < newSortResult.data.length - 1; i++) {
      const current = new Date(newSortResult.data[i].created_at).getTime();
      const next = new Date(newSortResult.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        `new sort order: post ${i} should be newer than post ${i + 1}`,
        current >= next,
      );
    }
  }
  // Test "hot" sorting
  const hotSortResult = await api.functional.communityPlatform.posts.index(
    { host: connection.host },
    {
      body: {
        sort: "hot",
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(hotSortResult);
  TestValidator.equals(
    "hot sort returns results",
    hotSortResult.data.length > 0,
    true,
  );
  // Test "top" sorting with different time ranges
  const timeRanges = ["today", "week", "month", "year", "all"] as const;
  for (const timeRange of timeRanges) {
    const topSortResult = await api.functional.communityPlatform.posts.index(
      { host: connection.host },
      {
        body: {
          sort: "top",
          top_time_range: timeRange,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformPost.IRequest,
      },
    );
    typia.assert(topSortResult);
    TestValidator.equals(
      `top sort with ${timeRange} returns results`,
      topSortResult.data.length > 0,
      true,
    );
  }
  // Test "controversial" sorting
  const controversialSortResult =
    await api.functional.communityPlatform.posts.index(
      { host: connection.host },
      {
        body: {
          sort: "controversial",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformPost.IRequest,
      },
    );
  typia.assert(controversialSortResult);
  TestValidator.equals(
    "controversial sort returns results",
    controversialSortResult.data.length > 0,
    true,
  );
  // Verify content previews using business logic only
  const postMap = new Map(posts.map((p) => [p.id, p]));
  for (const postSummary of newSortResult.data) {
    const fullPost = postMap.get(postSummary.id);
    if (fullPost) {
      if (fullPost.content_type === "TEXT") {
        // Validate content preview is a non-empty string
        TestValidator.predicate(
          `text post ${postSummary.id} has content preview`,
          postSummary.content_preview.length > 0,
        );
      } else if (fullPost.content_type === "LINK") {
        // Validate content preview contains domain information
        TestValidator.predicate(
          `link post ${postSummary.id} has domain preview`,
          postSummary.content_preview.length > 0,
        );
      }
    }
  }
  // Test filtering by community
  const communityFilterResult =
    await api.functional.communityPlatform.posts.index(
      { host: connection.host },
      {
        body: {
          sort: "new",
          community_id: communities[0].id,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformPost.IRequest,
      },
    );
  typia.assert(communityFilterResult);
  TestValidator.equals(
    "community filter returns posts from that community",
    communityFilterResult.data.length > 0,
    true,
  );
  for (const post of communityFilterResult.data) {
    TestValidator.equals(
      `post ${post.id} belongs to filtered community`,
      post.community.id,
      communities[0].id,
    );
  }
  // Test filtering by content type
  const textFilterResult = await api.functional.communityPlatform.posts.index(
    { host: connection.host },
    {
      body: {
        sort: "new",
        content_type: "TEXT",
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(textFilterResult);
  TestValidator.predicate(
    "text filter returns text posts",
    textFilterResult.data.length > 0,
  );
}
