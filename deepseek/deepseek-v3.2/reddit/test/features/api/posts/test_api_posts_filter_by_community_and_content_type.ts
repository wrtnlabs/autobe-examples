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

export async function test_api_posts_filter_by_community_and_content_type(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create multiple member accounts
  const memberConnections: api.IConnection[] = await ArrayUtil.asyncRepeat(
    3,
    async (index) => {
      const memberConnection: api.IConnection = { host: connection.host };
      await authorize_member_join(memberConnection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: "test1234",
          username: `user${index}_${RandomGenerator.alphaNumeric(6)}`,
          nickname: RandomGenerator.name(1),
          href: "https://example.com",
          referrer: "https://example.com",
          ip: typia.random<string & tags.Format<"ipv4">>(),
        },
      });
      return memberConnection;
    },
  );
  // Step 2: Create multiple communities
  const communities: ICommunityPlatformCommunity[] =
    await ArrayUtil.asyncRepeat(2, async (index) => {
      const community =
        await generate_random_community_platform_member_communities_create(
          memberConnections[0],
          {
            body: {
              name: `community${index}_${RandomGenerator.alphaNumeric(8)}`,
              description: RandomGenerator.paragraph({ sentences: 2 }),
            },
          },
        );
      typia.assert(community);
      return community;
    });
  // Step 3: Create diverse posts across communities with different content types
  // We'll create posts with specific timestamps for date range testing
  const now = new Date();
  const postTimestamps = [
    new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
    new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    now.toISOString(), // now
  ];
  const allPosts: ICommunityPlatformPost[] = [];
  // Create posts with different combinations
  for (let i = 0; i < postTimestamps.length; i++) {
    const authorIndex = i % memberConnections.length;
    const communityIndex = i % communities.length;
    const contentTypes: Array<"TEXT" | "LINK" | "IMAGE"> = [
      "TEXT",
      "LINK",
      "IMAGE",
    ];
    const contentType = contentTypes[i % contentTypes.length];
    // Use different content based on type
    const body = {
      title: `Post ${i} - ${contentType} - ${RandomGenerator.name(2)}`,
      community_name: communities[communityIndex].name,
      content_type: contentType,
    } satisfies ICommunityPlatformPost.ICreate;
    // Add content-specific fields
    if (contentType === "TEXT") {
      (body as any).content_text = {
        content: RandomGenerator.paragraph({ sentences: 3 }),
        formatting: "plain",
      };
    } else if (contentType === "LINK") {
      (body as any).content_link = {
        url: "https://example.com/" + RandomGenerator.alphaNumeric(8),
      };
    } else if (contentType === "IMAGE") {
      (body as any).content_attachment = {
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
      };
    }
    // Simulate creation with specific timestamp - we'll use actual API call
    const post = await generate_random_community_platform_member_posts_create(
      memberConnections[authorIndex],
      { body },
    );
    typia.assert(post);
    allPosts.push(post);
  }
  // Step 4: Test filtering by community_id
  const firstCommunity = communities[0];
  const postsInFirstCommunity = allPosts.filter(
    (post) => post.community.id === firstCommunity.id,
  );
  const communityFilterResult =
    await api.functional.communityPlatform.posts.index(connection, {
      body: {
        sort: "new",
        page: 1,
        limit: 100,
        community_id: firstCommunity.id,
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(communityFilterResult);
  TestValidator.equals(
    "community filter returns correct posts",
    communityFilterResult.data.length,
    postsInFirstCommunity.length,
  );
  // Step 5: Test filtering by content_type
  const textPosts = allPosts.filter((post) => post.content_type === "TEXT");
  const textFilterResult = await api.functional.communityPlatform.posts.index(
    connection,
    {
      body: {
        sort: "new",
        page: 1,
        limit: 100,
        content_type: "TEXT",
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(textFilterResult);
  TestValidator.equals(
    "content_type TEXT filter returns correct posts",
    textFilterResult.data.length,
    textPosts.length,
  );
  // Step 6: Test combined filtering by community AND content_type
  const firstCommunityTextPosts = allPosts.filter(
    (post) =>
      post.community.id === firstCommunity.id && post.content_type === "TEXT",
  );
  const combinedFilterResult =
    await api.functional.communityPlatform.posts.index(connection, {
      body: {
        sort: "new",
        page: 1,
        limit: 100,
        community_id: firstCommunity.id,
        content_type: "TEXT",
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(combinedFilterResult);
  TestValidator.equals(
    "combined community and content_type filter returns correct posts",
    combinedFilterResult.data.length,
    firstCommunityTextPosts.length,
  );
  // Step 7: Test filtering by author_id
  const firstAuthorId = allPosts[0].author.id;
  const authorPosts = allPosts.filter(
    (post) => post.author.id === firstAuthorId,
  );
  const authorFilterResult = await api.functional.communityPlatform.posts.index(
    connection,
    {
      body: {
        sort: "new",
        page: 1,
        limit: 100,
        author_id: firstAuthorId,
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(authorFilterResult);
  TestValidator.equals(
    "author_id filter returns correct posts",
    authorFilterResult.data.length,
    authorPosts.length,
  );
  // Step 8: Test date range filtering
  const twoDaysAgo = new Date(
    now.getTime() - 2 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const oneDayAgo = new Date(
    now.getTime() - 1 * 24 * 60 * 60 * 1000,
  ).toISOString();
  // Posts between 2 days ago and 1 day ago
  const dateRangePosts = allPosts.filter((post) => {
    const postDate = new Date(post.created_at).getTime();
    const startTime = new Date(twoDaysAgo).getTime();
    const endTime = new Date(oneDayAgo).getTime();
    return postDate >= startTime && postDate <= endTime;
  });
  const dateFilterResult = await api.functional.communityPlatform.posts.index(
    connection,
    {
      body: {
        sort: "new",
        page: 1,
        limit: 100,
        created_at_start: twoDaysAgo,
        created_at_end: oneDayAgo,
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(dateFilterResult);
  TestValidator.equals(
    "date range filter returns correct posts",
    dateFilterResult.data.length,
    dateRangePosts.length,
  );
  // Step 9: Test edge cases
  // Non-existent community
  const nonExistentCommunityFilter =
    await api.functional.communityPlatform.posts.index(connection, {
      body: {
        sort: "new",
        page: 1,
        limit: 100,
        community_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(nonExistentCommunityFilter);
  TestValidator.equals(
    "non-existent community returns empty results",
    nonExistentCommunityFilter.data.length,
    0,
  );
  // Invalid content_type (should return empty or error)
  // Note: content_type is typed as "TEXT" | "LINK" | "IMAGE" | null | undefined
  // So we cannot test invalid string - we'll test null
  const nullContentTypeFilter =
    await api.functional.communityPlatform.posts.index(connection, {
      body: {
        sort: "new",
        page: 1,
        limit: 100,
        content_type: null,
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(nullContentTypeFilter);
  // Null content_type should return all posts
  TestValidator.predicate(
    "null content_type returns all posts",
    nullContentTypeFilter.data.length >= allPosts.length,
  );
  // Step 10: Test pagination
  const paginationTest = await api.functional.communityPlatform.posts.index(
    connection,
    {
      body: {
        sort: "new",
        page: 1,
        limit: 2,
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(paginationTest);
  TestValidator.equals(
    "pagination limit works",
    paginationTest.data.length <= 2,
    true,
  );
  TestValidator.predicate(
    "pagination metadata exists",
    paginationTest.pagination.current === 1 &&
      paginationTest.pagination.limit === 2 &&
      paginationTest.pagination.pages >= 1,
  );
}
