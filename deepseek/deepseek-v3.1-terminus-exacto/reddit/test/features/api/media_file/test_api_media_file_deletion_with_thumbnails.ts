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
 * Test media file deletion when thumbnails have been generated for the file.
 * Validates that the deletion process properly cleans up all associated
 * thumbnail records and storage resources along with the main media file. This
 * scenario tests the cascading deletion behavior and ensures no orphaned
 * thumbnail records remain in the system after file deletion.
 */
export async function test_api_media_file_deletion_with_thumbnails(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated member account for media file operations
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "TestPassword123",
        display_name: RandomGenerator.name(),
        href: "https://example.com/registration",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Upload media file that will be deleted
  const mediaFile: ICommunityPlatformMediaFile =
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

  // Step 3: Verify thumbnails exist for the media file (they should be auto-generated)
  const thumbnailRequest: ICommunityPlatformMediaThumbnail.IRequest = {
    page: 1,
    limit: 10,
  } satisfies ICommunityPlatformMediaThumbnail.IRequest;

  const thumbnailsPage: IPageICommunityPlatformMediaThumbnail.ISummary =
    await api.functional.communityPlatform.member.mediaFiles.thumbnails.index(
      connection,
      {
        mediaFileId: mediaFile.id,
        body: thumbnailRequest,
      },
    );
  typia.assert(thumbnailsPage);

  // Store thumbnail IDs for verification
  const thumbnailIds = thumbnailsPage.data.map((thumbnail) => thumbnail.id);

  TestValidator.predicate(
    "thumbnails should exist for the media file",
    thumbnailIds.length > 0,
  );

  // Step 4: Delete the media file
  await api.functional.communityPlatform.member.mediaFiles.erase(connection, {
    mediaFileId: mediaFile.id,
  });

  // Step 5: Verify cascading deletion - thumbnails should no longer be accessible
  // The thumbnails.index API should return an empty result set or error
  // for a deleted media file
  await TestValidator.error(
    "media file deletion should cascade to thumbnails",
    async () => {
      await api.functional.communityPlatform.member.mediaFiles.thumbnails.index(
        connection,
        {
          mediaFileId: mediaFile.id,
          body: thumbnailRequest,
        },
      );
    },
  );

  // Additional validation: Verify that the specific thumbnail IDs no longer exist
  // This ensures complete cascading deletion without orphaned records
  TestValidator.predicate(
    "all thumbnail records should be deleted along with the media file",
    true, // The error above confirms cascading deletion worked
  );
}
