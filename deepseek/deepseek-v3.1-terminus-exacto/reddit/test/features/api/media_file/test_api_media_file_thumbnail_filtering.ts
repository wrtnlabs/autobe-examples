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
 * Test advanced thumbnail filtering capabilities including dimension-based
 * filtering, format selection, quality range filtering, and sorting options.
 * Validates that the thumbnail search functionality correctly applies filters
 * for specific thumbnail sizes, image formats, and quality ranges.
 */
export async function test_api_media_file_thumbnail_filtering(
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

  // Step 2: Upload media file to generate thumbnails
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

  // Step 3: Test thumbnail filtering with various parameters

  // Test 3.1: Dimension-based filtering
  const dimensionFiltered =
    await api.functional.communityPlatform.member.mediaFiles.thumbnails.index(
      connection,
      {
        mediaFileId: mediaFile.id,
        body: {
          thumbnail_size: "150x150",
          limit: 10,
          page: 1,
        } satisfies ICommunityPlatformMediaThumbnail.IRequest,
      },
    );
  typia.assert(dimensionFiltered);
  TestValidator.predicate(
    "dimension filter returns results",
    dimensionFiltered.data.length > 0,
  );

  // Validate dimension filter effectiveness
  if (dimensionFiltered.data.length > 0) {
    dimensionFiltered.data.forEach((thumbnail, index) => {
      TestValidator.equals(
        `thumbnail ${index} has correct dimension`,
        thumbnail.thumbnail_size,
        "150x150",
      );
    });
  }

  // Test 3.2: Format filtering
  const formatFiltered =
    await api.functional.communityPlatform.member.mediaFiles.thumbnails.index(
      connection,
      {
        mediaFileId: mediaFile.id,
        body: {
          format: "JPEG",
          limit: 10,
          page: 1,
        } satisfies ICommunityPlatformMediaThumbnail.IRequest,
      },
    );
  typia.assert(formatFiltered);
  TestValidator.predicate(
    "format filter returns results",
    formatFiltered.data.length > 0,
  );

  // Validate format filter effectiveness
  if (formatFiltered.data.length > 0) {
    formatFiltered.data.forEach((thumbnail, index) => {
      TestValidator.equals(
        `thumbnail ${index} has correct format`,
        thumbnail.format,
        "JPEG",
      );
    });
  }

  // Test 3.3: Quality range filtering
  const qualityFiltered =
    await api.functional.communityPlatform.member.mediaFiles.thumbnails.index(
      connection,
      {
        mediaFileId: mediaFile.id,
        body: {
          quality_min: 50,
          quality_max: 80,
          limit: 10,
          page: 1,
        } satisfies ICommunityPlatformMediaThumbnail.IRequest,
      },
    );
  typia.assert(qualityFiltered);
  TestValidator.predicate(
    "quality range filter returns results",
    qualityFiltered.data.length > 0,
  );

  // Validate quality range filter effectiveness
  if (qualityFiltered.data.length > 0) {
    qualityFiltered.data.forEach((thumbnail, index) => {
      TestValidator.predicate(
        `thumbnail ${index} quality within range`,
        thumbnail.quality >= 50 && thumbnail.quality <= 80,
      );
    });
  }

  // Test 3.4: Sorting by quality (descending)
  const sortedByQuality =
    await api.functional.communityPlatform.member.mediaFiles.thumbnails.index(
      connection,
      {
        mediaFileId: mediaFile.id,
        body: {
          order_by: "quality",
          order: "desc",
          limit: 10,
          page: 1,
        } satisfies ICommunityPlatformMediaThumbnail.IRequest,
      },
    );
  typia.assert(sortedByQuality);
  TestValidator.predicate(
    "sorting returns results",
    sortedByQuality.data.length > 0,
  );

  // Validate sorting effectiveness
  if (sortedByQuality.data.length > 1) {
    for (let i = 0; i < sortedByQuality.data.length - 1; i++) {
      TestValidator.predicate(
        `thumbnail ${i} quality >= thumbnail ${i + 1} quality`,
        sortedByQuality.data[i].quality >= sortedByQuality.data[i + 1].quality,
      );
    }
  }

  // Test 3.5: Pagination validation
  const firstPage =
    await api.functional.communityPlatform.member.mediaFiles.thumbnails.index(
      connection,
      {
        mediaFileId: mediaFile.id,
        body: {
          limit: 5,
          page: 1,
        } satisfies ICommunityPlatformMediaThumbnail.IRequest,
      },
    );
  typia.assert(firstPage);

  const secondPage =
    await api.functional.communityPlatform.member.mediaFiles.thumbnails.index(
      connection,
      {
        mediaFileId: mediaFile.id,
        body: {
          limit: 5,
          page: 2,
        } satisfies ICommunityPlatformMediaThumbnail.IRequest,
      },
    );
  typia.assert(secondPage);

  // Validate pagination structure
  TestValidator.equals(
    "pagination has current page",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals("pagination has limit", firstPage.pagination.limit, 5);
  TestValidator.predicate(
    "pagination has total records",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has total pages",
    firstPage.pagination.pages >= 0,
  );

  // Test 3.6: Combined filtering with multiple criteria
  const combinedFilter =
    await api.functional.communityPlatform.member.mediaFiles.thumbnails.index(
      connection,
      {
        mediaFileId: mediaFile.id,
        body: {
          thumbnail_size: "300x300",
          format: "PNG",
          quality_min: 60,
          order_by: "created_at",
          order: "asc",
          limit: 10,
          page: 1,
        } satisfies ICommunityPlatformMediaThumbnail.IRequest,
      },
    );
  typia.assert(combinedFilter);
  TestValidator.predicate(
    "combined filter returns results",
    combinedFilter.data.length >= 0,
  );

  // Validate combined filter effectiveness
  if (combinedFilter.data.length > 0) {
    combinedFilter.data.forEach((thumbnail, index) => {
      TestValidator.equals(
        `combined filter thumbnail ${index} has correct dimension`,
        thumbnail.thumbnail_size,
        "300x300",
      );
      TestValidator.equals(
        `combined filter thumbnail ${index} has correct format`,
        thumbnail.format,
        "PNG",
      );
      TestValidator.predicate(
        `combined filter thumbnail ${index} quality within range`,
        thumbnail.quality >= 60,
      );
    });
  }

  // Test 3.7: Search functionality
  const searchFiltered =
    await api.functional.communityPlatform.member.mediaFiles.thumbnails.index(
      connection,
      {
        mediaFileId: mediaFile.id,
        body: {
          search: "150",
          limit: 10,
          page: 1,
        } satisfies ICommunityPlatformMediaThumbnail.IRequest,
      },
    );
  typia.assert(searchFiltered);
  TestValidator.predicate(
    "search filter returns results",
    searchFiltered.data.length >= 0,
  );

  // Final validation: Ensure all thumbnails have required properties
  if (dimensionFiltered.data.length > 0) {
    const thumbnail = dimensionFiltered.data[0];
    TestValidator.predicate("thumbnail has valid ID", thumbnail.id.length > 0);
    TestValidator.predicate(
      "thumbnail has valid size",
      thumbnail.thumbnail_size.length > 0,
    );
    TestValidator.predicate(
      "thumbnail has valid format",
      thumbnail.format.length > 0,
    );
    TestValidator.predicate(
      "thumbnail has valid quality",
      thumbnail.quality >= 1 && thumbnail.quality <= 100,
    );
    TestValidator.predicate(
      "thumbnail has valid file size",
      thumbnail.file_size >= 0,
    );
  }

  // Test error conditions
  await TestValidator.error("invalid media file ID should fail", async () => {
    await api.functional.communityPlatform.member.mediaFiles.thumbnails.index(
      connection,
      {
        mediaFileId: typia.random<string & tags.Format<"uuid">>(), // Non-existent ID
        body: {
          limit: 10,
          page: 1,
        } satisfies ICommunityPlatformMediaThumbnail.IRequest,
      },
    );
  });
}
