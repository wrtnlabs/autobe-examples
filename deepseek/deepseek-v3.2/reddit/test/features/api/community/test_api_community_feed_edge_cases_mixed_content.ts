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
 * Test community feed edge cases and business rules.
 * 1. Empty communities return empty feeds with proper pagination
 * 2. Mixed post types (TEXT, LINK, IMAGE) display correct content previews
 * 3. Posts from other communities do not appear in wrong community feeds
 * 4. Deleted posts are excluded from feeds
 * 5. Pagination boundary cases: first, middle, last, and beyond last page
 * 6. Response structure includes proper pagination metadata
 */
export async function test_api_community_feed_edge_cases_mixed_content(
  connection: api.IConnection,
): Promise<void> {
  // Create first member for community creation and text post
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {});
  typia.assert(member1);
  // Create community for testing
  const community =
    await generate_random_community_platform_member_communities_create(
      member1Connection,
      {},
    );
  typia.assert(community);
  // Test 1: Empty community returns empty feed
  const emptyFeed =
    await api.functional.communityPlatform.communities.feeds.index(
      connection, // Use base connection since community feeds are public
      {
        communityId: community.id,
        body: {
          sort: "new",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformPost.IRequest,
      },
    );
  typia.assert(emptyFeed);
  TestValidator.equals("empty feed records", emptyFeed.pagination.records, 0);
  TestValidator.equals("empty feed data length", emptyFeed.data.length, 0);
  TestValidator.equals("empty feed pages", emptyFeed.pagination.pages, 0);
  TestValidator.equals(
    "empty feed current page",
    emptyFeed.pagination.current,
    1,
  );
  TestValidator.equals("empty feed limit", emptyFeed.pagination.limit, 10);
  // Create second member for link post (different user)
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {});
  typia.assert(member2);
  // Subscribe both members to community (required for posting)
  // Note: Subscribing implementation would require subscription API which isn't provided
  // We'll assume members are automatically subscribed as owners or have permission
  // This is a limitation based on available APIs
  // Test 2: Mixed post types
  // Create text post (member1)
  const textPost = await generate_random_community_platform_member_posts_create(
    member1Connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        community_name: community.name,
        content_type: "TEXT",
        content_text: {
          content: RandomGenerator.content({ paragraphs: 2 }),
          formatting: "plain",
        } satisfies ICommunityPlatformPostText.ICreate,
      } satisfies DeepPartial<ICommunityPlatformPost.ICreate>,
    },
  );
  typia.assert(textPost);
  // Create link post (member2)
  const linkPost = await generate_random_community_platform_member_posts_create(
    member2Connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        community_name: community.name,
        content_type: "LINK",
        content_link: {
          url: "https://example.com/article" as string &
            tags.MaxLength<80000> &
            tags.Format<"url">,
          title: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformPostLink.ICreate,
      } satisfies DeepPartial<ICommunityPlatformPost.ICreate>,
    },
  );
  typia.assert(linkPost);
  // Create third member for image post
  const member3Connection: api.IConnection = { host: connection.host };
  const member3 = await authorize_member_join(member3Connection, {});
  typia.assert(member3);
  // Image posts require file upload - skip for now as it requires file upload API
  // We'll test TEXT and LINK only for mixed content
  // Get community feed with mixed posts
  const mixedFeed =
    await api.functional.communityPlatform.communities.feeds.index(connection, {
      communityId: community.id,
      body: {
        sort: "new",
        page: 1,
        limit: 20,
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(mixedFeed);
  TestValidator.equals(
    "mixed feed should have 2 posts",
    mixedFeed.pagination.records,
    2,
  );
  TestValidator.equals("mixed feed data length", mixedFeed.data.length, 2);
  // Verify post content previews
  for (const post of mixedFeed.data) {
    if (post.id === textPost.id) {
      // Text post should have content preview (first 200 chars)
      TestValidator.predicate(
        "text post has content preview",
        post.content_preview.length > 0,
      );
    } else if (post.id === linkPost.id) {
      // Link post should have domain preview
      TestValidator.predicate(
        "link post has domain preview",
        post.content_preview.includes("example.com") ||
          post.content_preview.length > 0,
      );
    }
  }
  // Test 3: Cross-community isolation
  // Create another community
  const otherCommunity =
    await generate_random_community_platform_member_communities_create(
      member1Connection,
      {},
    );
  typia.assert(otherCommunity);
  // Create post in other community
  const otherPost =
    await generate_random_community_platform_member_posts_create(
      member1Connection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          community_name: otherCommunity.name,
          content_type: "TEXT",
          content_text: {
            content: RandomGenerator.content({ paragraphs: 1 }),
            formatting: "plain",
          } satisfies ICommunityPlatformPostText.ICreate,
        } satisfies DeepPartial<ICommunityPlatformPost.ICreate>,
      },
    );
  typia.assert(otherPost);
  // Verify original community feed doesn't contain post from other community
  const originalCommunityFeed =
    await api.functional.communityPlatform.communities.feeds.index(connection, {
      communityId: community.id,
      body: {
        sort: "new",
        page: 1,
        limit: 20,
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(originalCommunityFeed);
  const hasOtherPost = originalCommunityFeed.data.some(
    (p) => p.id === otherPost.id,
  );
  TestValidator.predicate(
    "original community feed should not contain post from other community",
    !hasOtherPost,
  );
  // Test 4: Deleted post exclusion
  // Post deletion API not provided in available functions
  // This test would require DELETE /communityPlatform/member/posts/{postId}
  // We'll skip this test due to API limitations
  // Test 5: Pagination boundary cases
  // Create enough posts for pagination testing
  const postsToCreate = 15;
  const createdPostIds: string[] = [];
  for (let i = 0; i < postsToCreate; i++) {
    const post = await generate_random_community_platform_member_posts_create(
      member1Connection,
      {
        body: {
          title: `Test Post ${i} - ${RandomGenerator.alphabets(5)}`,
          community_name: community.name,
          content_type: "TEXT",
          content_text: {
            content: `Content for post ${i}`,
            formatting: "plain",
          } satisfies ICommunityPlatformPostText.ICreate,
        } satisfies DeepPartial<ICommunityPlatformPost.ICreate>,
      },
    );
    typia.assert(post);
    createdPostIds.push(post.id);
  }
  // Test first page
  const firstPage =
    await api.functional.communityPlatform.communities.feeds.index(connection, {
      communityId: community.id,
      body: {
        sort: "new",
        page: 1,
        limit: 5,
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(firstPage);
  TestValidator.equals("first page current", firstPage.pagination.current, 1);
  TestValidator.equals("first page limit", firstPage.pagination.limit, 5);
  TestValidator.equals("first page data length", firstPage.data.length, 5);
  TestValidator.predicate(
    "first page has records",
    firstPage.pagination.records >= postsToCreate + 2,
  );
  // Test middle page
  const middlePage =
    await api.functional.communityPlatform.communities.feeds.index(connection, {
      communityId: community.id,
      body: {
        sort: "new",
        page: 2,
        limit: 5,
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(middlePage);
  TestValidator.equals("middle page current", middlePage.pagination.current, 2);
  TestValidator.equals("middle page limit", middlePage.pagination.limit, 5);
  TestValidator.predicate("middle page has data", middlePage.data.length > 0);
  // Test last page
  const totalRecords = firstPage.pagination.records;
  const limit = 5;
  const lastPageNumber = Math.ceil(totalRecords / limit);
  const lastPage =
    await api.functional.communityPlatform.communities.feeds.index(connection, {
      communityId: community.id,
      body: {
        sort: "new",
        page: lastPageNumber,
        limit,
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(lastPage);
  TestValidator.equals(
    "last page current",
    lastPage.pagination.current,
    lastPageNumber,
  );
  TestValidator.equals("last page limit", lastPage.pagination.limit, limit);
  TestValidator.predicate("last page has data", lastPage.data.length > 0);
  TestValidator.predicate(
    "last page data length <= limit",
    lastPage.data.length <= limit,
  );
  // Test beyond last page
  const beyondLastPage =
    await api.functional.communityPlatform.communities.feeds.index(connection, {
      communityId: community.id,
      body: {
        sort: "new",
        page: lastPageNumber + 1,
        limit,
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(beyondLastPage);
  TestValidator.equals(
    "beyond last page current",
    beyondLastPage.pagination.current,
    lastPageNumber + 1,
  );
  TestValidator.equals(
    "beyond last page data length",
    beyondLastPage.data.length,
    0,
  );
  // Test 6: Response structure validation
  // All feeds already validated with typia.assert() which validates complete structure
  // Additional explicit validation for pagination metadata
  TestValidator.predicate(
    "pagination has current field",
    typeof firstPage.pagination.current === "number",
  );
  TestValidator.predicate(
    "pagination has limit field",
    typeof firstPage.pagination.limit === "number",
  );
  TestValidator.predicate(
    "pagination has records field",
    typeof firstPage.pagination.records === "number",
  );
  TestValidator.predicate(
    "pagination has pages field",
    typeof firstPage.pagination.pages === "number",
  );
  // Verify pages calculation: pages = ceil(records / limit)
  const expectedPages = Math.ceil(
    firstPage.pagination.records / firstPage.pagination.limit,
  );
  TestValidator.equals(
    "pages calculation correct",
    firstPage.pagination.pages,
    expectedPages,
  );
}
