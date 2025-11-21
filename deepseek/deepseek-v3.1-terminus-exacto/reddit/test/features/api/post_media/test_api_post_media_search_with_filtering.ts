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
 * Comprehensive test for media search functionality with filtering
 * capabilities.
 *
 * This test validates that members can search and retrieve media files
 * associated with their posts using pagination, search terms in captions, and
 * sorting options. Covers filtering by display order, creation date, and
 * caption content to ensure proper media gallery functionality.
 */
export async function test_api_post_media_search_with_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create member account for authentication
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

  // Step 2: Create a post to associate media with
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

  // Step 3: Upload multiple media files with varied captions
  const mediaFiles: ICommunityPlatformMediaFile[] = [];
  const captions = [
    "Beautiful sunset over mountains",
    "City skyline at night",
    "Ocean waves crashing",
    "Forest hiking trail",
    "Urban street art",
  ];

  for (let i = 0; i < 5; i++) {
    const mediaFile =
      await api.functional.communityPlatform.member.mediaFiles.create(
        connection,
        {
          body: {
            file_name: `media_${i}.jpg`,
            file_type: "image/jpeg",
            file_size: typia.random<
              number &
                tags.Type<"int32"> &
                tags.Minimum<1000> &
                tags.Maximum<5000000>
            >(),
            storage_path: `/uploads/media_${i}.jpg`,
            optimization_level: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<50> & tags.Maximum<90>
            >(),
          } satisfies ICommunityPlatformMediaFile.ICreate,
        },
      );
    typia.assert(mediaFile);
    mediaFiles.push(mediaFile);
  }

  // Step 4: Associate media files with the post using different display orders
  const mediaAssociations: ICommunityPlatformPostMedia[] = [];
  for (let i = 0; i < mediaFiles.length; i++) {
    const mediaAssociation =
      await api.functional.communityPlatform.member.posts.media.create(
        connection,
        {
          postId: post.id,
          body: {
            community_platform_post_id: post.id,
            community_platform_media_file_id: mediaFiles[i].id,
            display_order: i + 1,
            caption: captions[i],
          } satisfies ICommunityPlatformPostMedia.ICreate,
        },
      );
    typia.assert(mediaAssociation);
    mediaAssociations.push(mediaAssociation);
  }

  // Step 5: Test basic search without filters (should return all media)
  const allMedia =
    await api.functional.communityPlatform.member.posts.media.index(
      connection,
      {
        postId: post.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformPostMedia.IRequest,
      },
    );
  typia.assert(allMedia);
  TestValidator.equals(
    "should return all associated media",
    allMedia.data.length,
    mediaAssociations.length,
  );

  // Step 6: Test search with caption filtering
  const filteredMedia =
    await api.functional.communityPlatform.member.posts.media.index(
      connection,
      {
        postId: post.id,
        body: {
          search: "sunset",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformPostMedia.IRequest,
      },
    );
  typia.assert(filteredMedia);
  TestValidator.predicate(
    "should find media with sunset caption",
    filteredMedia.data.length > 0,
  );

  // Step 7: Test pagination functionality
  const paginatedMedia =
    await api.functional.communityPlatform.member.posts.media.index(
      connection,
      {
        postId: post.id,
        body: {
          page: 1,
          limit: 2,
        } satisfies ICommunityPlatformPostMedia.IRequest,
      },
    );
  typia.assert(paginatedMedia);
  TestValidator.equals(
    "should respect page limit",
    paginatedMedia.data.length,
    2,
  );

  // Step 8: Test sorting by display order
  const sortedByOrder =
    await api.functional.communityPlatform.member.posts.media.index(
      connection,
      {
        postId: post.id,
        body: {
          order_by: "display_order",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformPostMedia.IRequest,
      },
    );
  typia.assert(sortedByOrder);
  TestValidator.predicate(
    "should be sorted by display order",
    sortedByOrder.data.every(
      (item, index, array) =>
        index === 0 || item.display_order >= array[index - 1].display_order,
    ),
  );

  // Step 9: Test sorting by creation date
  const sortedByDate =
    await api.functional.communityPlatform.member.posts.media.index(
      connection,
      {
        postId: post.id,
        body: {
          order_by: "created_at",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformPostMedia.IRequest,
      },
    );
  typia.assert(sortedByDate);

  // Step 10: Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    allMedia.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination records count",
    allMedia.pagination.records,
    mediaAssociations.length,
  );
  TestValidator.predicate(
    "pagination pages calculation",
    allMedia.pagination.pages >= 1,
  );

  // Step 11: Test empty search term (should return all results)
  const emptySearch =
    await api.functional.communityPlatform.member.posts.media.index(
      connection,
      {
        postId: post.id,
        body: {
          search: "",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformPostMedia.IRequest,
      },
    );
  typia.assert(emptySearch);
  TestValidator.equals(
    "empty search should return all media",
    emptySearch.data.length,
    mediaAssociations.length,
  );

  // Step 12: Test non-matching search term
  const nonMatchingSearch =
    await api.functional.communityPlatform.member.posts.media.index(
      connection,
      {
        postId: post.id,
        body: {
          search: "nonexistentterm",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformPostMedia.IRequest,
      },
    );
  typia.assert(nonMatchingSearch);
  TestValidator.equals(
    "non-matching search should return empty",
    nonMatchingSearch.data.length,
    0,
  );

  // Step 13: Validate media-post relationship integrity
  TestValidator.predicate(
    "all media associations should reference the correct post",
    allMedia.data.every((item) => item.community_platform_post_id === post.id),
  );

  // Step 14: Test error handling for invalid post ID
  await TestValidator.error("should reject invalid post ID", async () => {
    await api.functional.communityPlatform.member.posts.media.index(
      connection,
      {
        postId: "invalid-uuid",
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformPostMedia.IRequest,
      },
    );
  });
}
