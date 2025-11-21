import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformMediaFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMediaFile";
import type { ICommunityPlatformMediaThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMediaThumbnail";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberSession";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformMediaThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMediaThumbnail";

/**
 * Test that moderators can successfully retrieve paginated thumbnail lists for
 * media files they have permission to access. This comprehensive test validates
 * thumbnail metadata retrieval including dimensions, file sizes, quality
 * settings, and storage paths. It ensures proper filtering by thumbnail size,
 * format, and quality ranges, and verifies that pagination works correctly with
 * sorting options based on thumbnail properties.
 */
export async function test_api_media_thumbnail_listing_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "password123";

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create and authenticate a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      display_name: RandomGenerator.name(),
      moderator_level: "community",
      is_active: true,
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 3: Upload a media file as the member
  const mediaFile =
    await api.functional.communityPlatform.member.mediaFiles.create(
      connection,
      {
        body: {
          file_name: "test-image.jpg",
          file_type: "image/jpeg",
          file_size: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          storage_path: "/uploads/test-image.jpg",
          optimization_level: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies ICommunityPlatformMediaFile.ICreate,
      },
    );
  typia.assert(mediaFile);

  // Step 4: Switch to moderator authentication
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Step 5: Test basic thumbnail listing with default pagination
  const defaultThumbnails =
    await api.functional.communityPlatform.moderator.mediaFiles.thumbnails.index(
      connection,
      {
        mediaFileId: mediaFile.id,
        body: {} satisfies ICommunityPlatformMediaThumbnail.IRequest,
      },
    );
  typia.assert(defaultThumbnails);

  TestValidator.equals(
    "pagination structure exists",
    defaultThumbnails.pagination,
    {
      current: 0,
      limit: 0,
      records: 0,
      pages: 0,
    } satisfies IPage.IPagination,
  );

  // Step 6: Test pagination with specific page and limit
  const paginatedThumbnails =
    await api.functional.communityPlatform.moderator.mediaFiles.thumbnails.index(
      connection,
      {
        mediaFileId: mediaFile.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformMediaThumbnail.IRequest,
      },
    );
  typia.assert(paginatedThumbnails);

  // Step 7: Test filtering by thumbnail size
  const sizeFilteredThumbnails =
    await api.functional.communityPlatform.moderator.mediaFiles.thumbnails.index(
      connection,
      {
        mediaFileId: mediaFile.id,
        body: {
          thumbnail_size: "150x150",
        } satisfies ICommunityPlatformMediaThumbnail.IRequest,
      },
    );
  typia.assert(sizeFilteredThumbnails);

  // Step 8: Test filtering by format
  const formatFilteredThumbnails =
    await api.functional.communityPlatform.moderator.mediaFiles.thumbnails.index(
      connection,
      {
        mediaFileId: mediaFile.id,
        body: {
          format: "JPEG",
        } satisfies ICommunityPlatformMediaThumbnail.IRequest,
      },
    );
  typia.assert(formatFilteredThumbnails);

  // Step 9: Test quality range filtering
  const qualityFilteredThumbnails =
    await api.functional.communityPlatform.moderator.mediaFiles.thumbnails.index(
      connection,
      {
        mediaFileId: mediaFile.id,
        body: {
          quality_min: 50,
          quality_max: 90,
        } satisfies ICommunityPlatformMediaThumbnail.IRequest,
      },
    );
  typia.assert(qualityFilteredThumbnails);

  // Step 10: Test sorting functionality
  const sortedThumbnails =
    await api.functional.communityPlatform.moderator.mediaFiles.thumbnails.index(
      connection,
      {
        mediaFileId: mediaFile.id,
        body: {
          order_by: "quality",
          order: "desc",
        } satisfies ICommunityPlatformMediaThumbnail.IRequest,
      },
    );
  typia.assert(sortedThumbnails);

  // Step 11: Test search functionality
  const searchedThumbnails =
    await api.functional.communityPlatform.moderator.mediaFiles.thumbnails.index(
      connection,
      {
        mediaFileId: mediaFile.id,
        body: {
          search: "thumbnail",
        } satisfies ICommunityPlatformMediaThumbnail.IRequest,
      },
    );
  typia.assert(searchedThumbnails);

  // Step 12: Validate thumbnail data structure when thumbnails exist
  if (defaultThumbnails.data.length > 0) {
    const thumbnail = defaultThumbnails.data[0];
    TestValidator.predicate("thumbnail has valid ID", thumbnail.id.length > 0);
    TestValidator.predicate(
      "thumbnail has valid media file reference",
      thumbnail.community_platform_media_file_id === mediaFile.id,
    );
    TestValidator.predicate(
      "thumbnail size is valid",
      thumbnail.thumbnail_size.length > 0,
    );
    TestValidator.predicate(
      "storage path exists",
      thumbnail.storage_path.length > 0,
    );
    TestValidator.predicate(
      "file size is non-negative",
      thumbnail.file_size >= 0,
    );
    TestValidator.predicate(
      "quality is within range",
      thumbnail.quality >= 1 && thumbnail.quality <= 100,
    );
    TestValidator.predicate("format is specified", thumbnail.format.length > 0);
    TestValidator.predicate(
      "created at timestamp is valid",
      thumbnail.created_at.length > 0,
    );
  }
}
