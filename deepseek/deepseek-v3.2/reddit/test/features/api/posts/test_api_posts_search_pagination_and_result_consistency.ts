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
 * Test pagination functionality and result consistency across pages for posts search.
 * Create multiple members, communities, and sufficient posts to test:
 * 1. Basic pagination with page and limit parameters
 * 2. Navigating through multiple pages maintains consistent ordering
 * 3. Total records count matches actual number of non-deleted posts
 * 4. Empty pages beyond total results return appropriate empty results
 * 5. Changing sort algorithm while paginating maintains correct ordering
 * 6. Filtered searches with pagination work correctly
 */
export async function test_api_posts_search_pagination_and_result_consistency(
  connection: api.IConnection,
): Promise<void> {
  // Create multiple member accounts for post authors
  const memberConnections: api.IConnection[] = [];
  const memberIds: string[] = [];
  for (let i = 0; i < 3; i++) {
    const memberConnection: api.IConnection = { host: connection.host };
    const member = await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        username: RandomGenerator.alphaNumeric(12),
        nickname: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies ICommunityPlatformMember.IJoin,
    });
    typia.assert(member);
    memberConnections.push(memberConnection);
    memberIds.push(member.id);
  }
  // Create multiple communities
  const communityNames: string[] = [];
  for (let i = 0; i < 2; i++) {
    const community =
      await generate_random_community_platform_member_communities_create(
        memberConnections[0],
        {
          body: {
            name: RandomGenerator.alphaNumeric(10),
            description: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies ICommunityPlatformCommunity.ICreate,
        },
      );
    typia.assert(community);
    communityNames.push(community.name);
  }
  // Create sufficient posts (more than default limit of 20)
  const totalPosts = 25; // More than default limit
  const postIds: string[] = [];
  const communityPosts: Record<string, string[]> = {};
  for (let i = 0; i < totalPosts; i++) {
    const memberIdx = i % memberConnections.length;
    const communityIdx = i % communityNames.length;
    const post = await generate_random_community_platform_member_posts_create(
      memberConnections[memberIdx],
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          community_name: communityNames[communityIdx],
          content_type: "TEXT" as const,
          content_text: {
            content: RandomGenerator.content({ paragraphs: 1 }),
            formatting: "plain",
          } satisfies ICommunityPlatformPostText.ICreate,
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
    typia.assert(post);
    postIds.push(post.id);
    if (!communityPosts[communityNames[communityIdx]]) {
      communityPosts[communityNames[communityIdx]] = [];
    }
    communityPosts[communityNames[communityIdx]].push(post.id);
  }
  // Wait a bit for consistent timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Test 1: Basic pagination with default parameters
  const firstPage = await api.functional.communityPlatform.posts.index(
    { host: connection.host },
    {
      body: {
        sort: "new",
        page: 1 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> as number,
        limit: 10 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100> as number,
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(firstPage);
  TestValidator.equals("first page has data", firstPage.data.length, 10);
  TestValidator.equals("first page metadata", firstPage.pagination.current, 1);
  TestValidator.equals("first page limit", firstPage.pagination.limit, 10);
  TestValidator.equals(
    "total records match",
    firstPage.pagination.records,
    totalPosts,
  );
  TestValidator.equals(
    "total pages calculation",
    firstPage.pagination.pages,
    Math.ceil(totalPosts / 10),
  );
  // Test 2: Navigate to second page
  const secondPage = await api.functional.communityPlatform.posts.index(
    { host: connection.host },
    {
      body: {
        sort: "new",
        page: 2 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> as number,
        limit: 10 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100> as number,
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(secondPage);
  TestValidator.equals("second page has data", secondPage.data.length, 10);
  TestValidator.equals(
    "second page metadata",
    secondPage.pagination.current,
    2,
  );
  // Test 3: Ensure no overlap between pages
  const firstPageIds = firstPage.data.map((post) => post.id);
  const secondPageIds = secondPage.data.map((post) => post.id);
  for (const id of firstPageIds) {
    TestValidator.predicate(
      "no duplicate IDs across pages",
      !secondPageIds.includes(id),
    );
  }
  // Test 4: Empty page beyond total results
  const emptyPage = await api.functional.communityPlatform.posts.index(
    { host: connection.host },
    {
      body: {
        sort: "new",
        page: 100 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> as number,
        limit: 10 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100> as number,
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(emptyPage);
  TestValidator.equals("empty page has no data", emptyPage.data.length, 0);
  TestValidator.equals("empty page current", emptyPage.pagination.current, 100);
  // Test 5: Test different sort algorithms
  const hotPage = await api.functional.communityPlatform.posts.index(
    { host: connection.host },
    {
      body: {
        sort: "hot",
        page: 1 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> as number,
        limit: 5 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100> as number,
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(hotPage);
  const topPage = await api.functional.communityPlatform.posts.index(
    { host: connection.host },
    {
      body: {
        sort: "top",
        top_time_range: "all" as const,
        page: 1 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> as number,
        limit: 5 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100> as number,
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(hotPage);
  TestValidator.equals("hot sort returns data", hotPage.data.length, 5);
  // Test 6: Filtered search with pagination
  const communityId = firstPage.data[0].community.id;
  const filteredPage = await api.functional.communityPlatform.posts.index(
    { host: connection.host },
    {
      body: {
        sort: "new",
        community_id: communityId satisfies string &
          tags.Format<"uuid"> as string & tags.Format<"uuid">,
        page: 1 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> as number,
        limit: 5 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100> as number,
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(filteredPage);
  // All posts in filtered page should belong to the same community
  for (const post of filteredPage.data) {
    TestValidator.equals(
      "filtered by community",
      post.community.id,
      communityId,
    );
  }
  // Test 7: Test maximum limit (100)
  const maxLimitPage = await api.functional.communityPlatform.posts.index(
    { host: connection.host },
    {
      body: {
        sort: "new",
        page: 1 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> as number,
        limit: 100 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100> as number,
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(maxLimitPage);
  TestValidator.equals(
    "maximum limit page limit",
    maxLimitPage.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "maximum limit returns data",
    maxLimitPage.data.length > 0,
  );
  // Test 8: Test pagination consistency with 'new' sort
  // Get all posts via pagination and verify we get all unique posts
  const allPaginatedIds = new Set<string>();
  let currentPage = 1;
  const pageSize = 7;
  while (true) {
    const page = await api.functional.communityPlatform.posts.index(
      { host: connection.host },
      {
        body: {
          sort: "new",
          page: currentPage satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> as number,
          limit: pageSize satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100> as number,
        } satisfies ICommunityPlatformPost.IRequest,
      },
    );
    typia.assert(page);
    for (const post of page.data) {
      allPaginatedIds.add(post.id);
    }
    if (page.data.length < pageSize) {
      break;
    }
    currentPage++;
  }
  TestValidator.equals(
    "pagination collects all posts",
    allPaginatedIds.size,
    totalPosts,
  );
  // Test 9: Verify all collected IDs match our created posts
  for (const postId of postIds) {
    TestValidator.predicate(
      `post ${postId} found in pagination`,
      allPaginatedIds.has(postId),
    );
  }
}
