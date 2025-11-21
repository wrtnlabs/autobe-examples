import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformMediaFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMediaFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberSession";

/**
 * Validate retrieval of media files with version tracking functionality.
 *
 * This test ensures that community platform members can successfully:
 *
 * 1. Register and authenticate as members
 * 2. Upload media files with proper version tracking
 * 3. Retrieve uploaded files with accurate metadata and version information
 * 4. Verify that version field reflects file processing iterations correctly
 */
export async function test_api_member_media_file_retrieval_versioned(
  connection: api.IConnection,
) {
  // Step 1: Create member account for media file operations
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "TestPassword123",
        display_name: RandomGenerator.name(),
        href: "https://community-platform.example.com/register",
        referrer: "https://community-platform.example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create test media file with version tracking
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

  // Step 3: Retrieve the media file with version tracking validation
  const retrievedFile: ICommunityPlatformMediaFile =
    await api.functional.communityPlatform.member.mediaFiles.at(connection, {
      mediaFileId: mediaFile.id,
    });
  typia.assert(retrievedFile);

  // Step 4: Validate file retrieval and version tracking
  TestValidator.equals(
    "retrieved file ID matches created file ID",
    retrievedFile.id,
    mediaFile.id,
  );
  TestValidator.equals(
    "file name matches",
    retrievedFile.file_name,
    mediaFile.file_name,
  );
  TestValidator.equals(
    "file type matches",
    retrievedFile.file_type,
    mediaFile.file_type,
  );
  TestValidator.equals(
    "file size matches",
    retrievedFile.file_size,
    mediaFile.file_size,
  );
  TestValidator.equals(
    "storage path matches",
    retrievedFile.storage_path,
    mediaFile.storage_path,
  );

  // Handle optional optimization_level with proper null/undefined checking
  if (mediaFile.optimization_level !== undefined) {
    TestValidator.equals(
      "optimization level matches",
      retrievedFile.optimization_level,
      mediaFile.optimization_level,
    );
  } else {
    TestValidator.equals(
      "optimization level should be undefined",
      retrievedFile.optimization_level,
      undefined,
    );
  }

  // Version tracking validation - initial version should be 1
  TestValidator.equals("initial version should be 1", retrievedFile.version, 1);

  // Validate member association
  TestValidator.equals(
    "member ID association matches",
    retrievedFile.community_platform_member_id,
    member.id,
  );

  // Validate member session association (session ID should be present)
  TestValidator.predicate(
    "file should have session ID",
    retrievedFile.community_platform_member_session_id.length > 0,
  );

  // Validate member summary information is present
  TestValidator.predicate(
    "member summary should be present",
    retrievedFile.member !== undefined,
  );
  if (retrievedFile.member) {
    TestValidator.equals(
      "member ID in summary matches",
      retrievedFile.member.id,
      member.id,
    );
    TestValidator.equals(
      "member email in summary matches",
      retrievedFile.member.email,
      member.email,
    );
    TestValidator.equals(
      "member display name in summary matches",
      retrievedFile.member.display_name,
      member.display_name,
    );
  }

  // Validate file status and timestamps
  TestValidator.predicate(
    "file should have valid status",
    retrievedFile.status.length > 0,
  );
  TestValidator.predicate(
    "created_at timestamp should be valid",
    retrievedFile.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at timestamp should be valid",
    retrievedFile.updated_at.length > 0,
  );

  // Validate that deleted_at is undefined for newly created files
  TestValidator.equals(
    "new file should not be deleted",
    retrievedFile.deleted_at,
    undefined,
  );
}
