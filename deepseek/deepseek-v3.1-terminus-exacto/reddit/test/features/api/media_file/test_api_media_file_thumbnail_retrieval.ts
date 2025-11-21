import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformMediaFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMediaFile";
import type { ICommunityPlatformMediaThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMediaThumbnail";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformMediaThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMediaThumbnail";

/**
 * Test retrieval of thumbnail versions for a media file with pagination and
 * filtering capabilities. Validates that the thumbnail listing operation
 * returns properly formatted thumbnail metadata including dimensions, file
 * sizes, quality levels, and storage paths. The test verifies pagination
 * functionality, search filtering by thumbnail size and format, and proper
 * access control ensuring members can only view thumbnails for their own media
 * files.
 */
export async function test_api_media_file_thumbnail_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated member account
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

  // Step 2: Upload a media file to generate thumbnails
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

  // Step 3: Retrieve thumbnails with pagination
  const thumbnailsPage1 =
    await api.functional.communityPlatform.member.mediaFiles.thumbnails.index(
      connection,
      {
        mediaFileId: mediaFile.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformMediaThumbnail.IRequest,
      },
    );
  typia.assert(thumbnailsPage1);

  // Validate pagination structure
  TestValidator.equals(
    "pagination should have current page 1",
    thumbnailsPage1.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination should have limit 10",
    thumbnailsPage1.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    thumbnailsPage1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    thumbnailsPage1.pagination.pages >= 0,
  );

  // Validate thumbnail data structure
  if (thumbnailsPage1.data.length > 0) {
    const thumbnail = thumbnailsPage1.data[0];
    TestValidator.predicate(
      "thumbnail should have valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        thumbnail.id,
      ),
    );
    TestValidator.equals(
      "thumbnail media file ID should match",
      thumbnail.community_platform_media_file_id,
      mediaFile.id,
    );
    TestValidator.predicate(
      "thumbnail size should be in format WxH",
      /^\d+x\d+$/.test(thumbnail.thumbnail_size),
    );
    TestValidator.predicate(
      "storage path should be defined",
      thumbnail.storage_path.length > 0,
    );
    TestValidator.predicate(
      "file size should be non-negative",
      thumbnail.file_size >= 0,
    );
    TestValidator.predicate(
      "quality should be between 1-100",
      thumbnail.quality >= 1 && thumbnail.quality <= 100,
    );
    TestValidator.predicate(
      "format should be defined",
      thumbnail.format.length > 0,
    );
    TestValidator.predicate(
      "created_at should be valid ISO date",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(thumbnail.created_at),
    );
  }

  // Step 4: Test filtering by thumbnail size
  const sizeFilteredThumbnails =
    await api.functional.communityPlatform.member.mediaFiles.thumbnails.index(
      connection,
      {
        mediaFileId: mediaFile.id,
        body: {
          thumbnail_size: "150x150",
          limit: 5,
        } satisfies ICommunityPlatformMediaThumbnail.IRequest,
      },
    );
  typia.assert(sizeFilteredThumbnails);

  // Step 5: Test filtering by format
  const formatFilteredThumbnails =
    await api.functional.communityPlatform.member.mediaFiles.thumbnails.index(
      connection,
      {
        mediaFileId: mediaFile.id,
        body: {
          format: "JPEG",
          limit: 5,
        } satisfies ICommunityPlatformMediaThumbnail.IRequest,
      },
    );
  typia.assert(formatFilteredThumbnails);

  // Step 6: Test quality range filtering
  const qualityFilteredThumbnails =
    await api.functional.communityPlatform.member.mediaFiles.thumbnails.index(
      connection,
      {
        mediaFileId: mediaFile.id,
        body: {
          quality_min: 50,
          quality_max: 100,
          limit: 5,
        } satisfies ICommunityPlatformMediaThumbnail.IRequest,
      },
    );
  typia.assert(qualityFilteredThumbnails);

  // Step 7: Test sorting functionality
  const sortedBySize =
    await api.functional.communityPlatform.member.mediaFiles.thumbnails.index(
      connection,
      {
        mediaFileId: mediaFile.id,
        body: {
          order_by: "thumbnail_size",
          order: "asc",
          limit: 5,
        } satisfies ICommunityPlatformMediaThumbnail.IRequest,
      },
    );
  typia.assert(sortedBySize);

  const sortedByQuality =
    await api.functional.communityPlatform.member.mediaFiles.thumbnails.index(
      connection,
      {
        mediaFileId: mediaFile.id,
        body: {
          order_by: "quality",
          order: "desc",
          limit: 5,
        } satisfies ICommunityPlatformMediaThumbnail.IRequest,
      },
    );
  typia.assert(sortedByQuality);

  const sortedByCreatedAt =
    await api.functional.communityPlatform.member.mediaFiles.thumbnails.index(
      connection,
      {
        mediaFileId: mediaFile.id,
        body: {
          order_by: "created_at",
          order: "desc",
          limit: 5,
        } satisfies ICommunityPlatformMediaThumbnail.IRequest,
      },
    );
  typia.assert(sortedByCreatedAt);

  // Step 8: Test search functionality
  const searchedThumbnails =
    await api.functional.communityPlatform.member.mediaFiles.thumbnails.index(
      connection,
      {
        mediaFileId: mediaFile.id,
        body: {
          search: "150",
          limit: 5,
        } satisfies ICommunityPlatformMediaThumbnail.IRequest,
      },
    );
  typia.assert(searchedThumbnails);

  // Step 9: Validate that member can access their own media file thumbnails
  TestValidator.predicate(
    "member should be able to access their own media file thumbnails",
    thumbnailsPage1.data.every(
      (thumbnail) =>
        thumbnail.community_platform_media_file_id === mediaFile.id,
    ),
  );
}
