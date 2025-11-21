import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMediaFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMediaFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberSession";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostMedia } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostMedia";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostMedia } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostMedia";

/**
 * Test pagination and ordering functionality for post media searches. Validates
 * that large media collections can be efficiently browsed using page-based
 * navigation with proper record counting and page calculation. Ensures display
 * order sorting maintains the author's intended media presentation sequence.
 */
export async function test_api_post_media_pagination_and_ordering(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: "password123",
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create a target post for media association
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
        post_type: "media",
        status: "published",
        community_platform_community_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 3: Upload multiple media files for pagination testing
  const mediaFiles = await ArrayUtil.asyncRepeat(15, async (index) => {
    const mediaFile =
      await api.functional.communityPlatform.member.mediaFiles.create(
        connection,
        {
          body: {
            file_name: `media_${index + 1}.jpg`,
            file_type: "image/jpeg",
            file_size: typia.random<
              number &
                tags.Type<"int32"> &
                tags.Minimum<1000> &
                tags.Maximum<5000000>
            >(),
            storage_path: `/uploads/media_${index + 1}.jpg`,
            optimization_level: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<50> & tags.Maximum<90>
            >(),
          } satisfies ICommunityPlatformMediaFile.ICreate,
        },
      );
    typia.assert(mediaFile);
    return mediaFile;
  });

  // Step 4: Create media associations with different display orders
  const mediaAssociations = await ArrayUtil.asyncMap(
    mediaFiles,
    async (mediaFile, index) => {
      const mediaAssociation =
        await api.functional.communityPlatform.member.posts.media.create(
          connection,
          {
            postId: post.id,
            body: {
              community_platform_post_id: post.id,
              community_platform_media_file_id: mediaFile.id,
              display_order: index + 1,
              caption: `Media caption ${index + 1}`,
            } satisfies ICommunityPlatformPostMedia.ICreate,
          },
        );
      typia.assert(mediaAssociation);
      return mediaAssociation;
    },
  );

  // Step 5: Test pagination with different page sizes
  // Test page 1 with limit 5
  const page1 = await api.functional.communityPlatform.member.posts.media.index(
    connection,
    {
      postId: post.id,
      body: {
        page: 1,
        limit: 5,
      } satisfies ICommunityPlatformPostMedia.IRequest,
    },
  );
  typia.assert(page1);

  TestValidator.equals("page 1 should have 5 items", page1.data.length, 5);
  TestValidator.equals(
    "page 1 current page should be 1",
    page1.pagination.current,
    1,
  );
  TestValidator.equals("page 1 limit should be 5", page1.pagination.limit, 5);
  TestValidator.equals(
    "page 1 total records should be 15",
    page1.pagination.records,
    15,
  );
  TestValidator.equals(
    "page 1 total pages should be 3",
    page1.pagination.pages,
    3,
  );

  // Test page 2 with limit 5
  const page2 = await api.functional.communityPlatform.member.posts.media.index(
    connection,
    {
      postId: post.id,
      body: {
        page: 2,
        limit: 5,
      } satisfies ICommunityPlatformPostMedia.IRequest,
    },
  );
  typia.assert(page2);

  TestValidator.equals("page 2 should have 5 items", page2.data.length, 5);
  TestValidator.equals(
    "page 2 current page should be 2",
    page2.pagination.current,
    2,
  );

  // Test page 3 with limit 5
  const page3 = await api.functional.communityPlatform.member.posts.media.index(
    connection,
    {
      postId: post.id,
      body: {
        page: 3,
        limit: 5,
      } satisfies ICommunityPlatformPostMedia.IRequest,
    },
  );
  typia.assert(page3);

  TestValidator.equals("page 3 should have 5 items", page3.data.length, 5);
  TestValidator.equals(
    "page 3 current page should be 3",
    page3.pagination.current,
    3,
  );

  // Test page 4 with limit 5 (should be empty)
  const page4 = await api.functional.communityPlatform.member.posts.media.index(
    connection,
    {
      postId: post.id,
      body: {
        page: 4,
        limit: 5,
      } satisfies ICommunityPlatformPostMedia.IRequest,
    },
  );
  typia.assert(page4);

  TestValidator.equals("page 4 should be empty", page4.data.length, 0);

  // Step 6: Test ordering by display_order
  const orderedByDisplay =
    await api.functional.communityPlatform.member.posts.media.index(
      connection,
      {
        postId: post.id,
        body: {
          order_by: "display_order",
          limit: 15,
        } satisfies ICommunityPlatformPostMedia.IRequest,
      },
    );
  typia.assert(orderedByDisplay);

  // Verify display order sequencing
  for (let i = 0; i < orderedByDisplay.data.length - 1; i++) {
    TestValidator.predicate(
      `display order should be sequential: ${orderedByDisplay.data[i].display_order} < ${orderedByDisplay.data[i + 1].display_order}`,
      orderedByDisplay.data[i].display_order <
        orderedByDisplay.data[i + 1].display_order,
    );
  }

  // Verify specific display order values
  orderedByDisplay.data.forEach((item, index) => {
    TestValidator.equals(
      `item ${index} should have display order ${index + 1}`,
      item.display_order,
      index + 1,
    );
  });

  // Step 7: Test ordering by created_at
  const orderedByCreated =
    await api.functional.communityPlatform.member.posts.media.index(
      connection,
      {
        postId: post.id,
        body: {
          order_by: "created_at",
          limit: 15,
        } satisfies ICommunityPlatformPostMedia.IRequest,
      },
    );
  typia.assert(orderedByCreated);

  // Verify created_at ordering
  for (let i = 0; i < orderedByCreated.data.length - 1; i++) {
    TestValidator.predicate(
      `created_at should be sequential: ${orderedByCreated.data[i].created_at} <= ${orderedByCreated.data[i + 1].created_at}`,
      new Date(orderedByCreated.data[i].created_at) <=
        new Date(orderedByCreated.data[i + 1].created_at),
    );
  }

  // Step 8: Test search functionality
  const searchResults =
    await api.functional.communityPlatform.member.posts.media.index(
      connection,
      {
        postId: post.id,
        body: {
          search: "caption 1",
          limit: 15,
        } satisfies ICommunityPlatformPostMedia.IRequest,
      },
    );
  typia.assert(searchResults);

  // Verify search results contain "caption 1"
  TestValidator.predicate(
    "search results should contain items with 'caption 1'",
    searchResults.data.some(
      (item) => item.caption?.includes("caption 1") || false,
    ),
  );

  // Step 9: Test default pagination (no parameters)
  const defaultPage =
    await api.functional.communityPlatform.member.posts.media.index(
      connection,
      {
        postId: post.id,
        body: {} satisfies ICommunityPlatformPostMedia.IRequest,
      },
    );
  typia.assert(defaultPage);

  TestValidator.predicate(
    "default page should have items",
    defaultPage.data.length > 0,
  );
  TestValidator.equals(
    "default page current page should be 1",
    defaultPage.pagination.current,
    1,
  );

  // Step 10: Verify all media associations are correctly linked
  const allMedia =
    await api.functional.communityPlatform.member.posts.media.index(
      connection,
      {
        postId: post.id,
        body: {
          limit: 50,
        } satisfies ICommunityPlatformPostMedia.IRequest,
      },
    );
  typia.assert(allMedia);

  TestValidator.equals(
    "all media associations should be retrieved",
    allMedia.data.length,
    15,
  );

  // Verify each media association has correct post reference
  allMedia.data.forEach((mediaItem, index) => {
    TestValidator.equals(
      `media item ${index} should reference the correct post`,
      mediaItem.community_platform_post_id,
      post.id,
    );
    TestValidator.equals(
      `media item ${index} should have correct display order`,
      mediaItem.display_order,
      index + 1,
    );
  });

  // Step 11: Test error scenario - invalid page number
  await TestValidator.error("should reject invalid page number", async () => {
    await api.functional.communityPlatform.member.posts.media.index(
      connection,
      {
        postId: post.id,
        body: {
          page: 0,
          limit: 5,
        } satisfies ICommunityPlatformPostMedia.IRequest,
      },
    );
  });
}
