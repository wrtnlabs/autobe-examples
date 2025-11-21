import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformMediaFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMediaFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberSession";

/**
 * Test retrieval of detailed media file information by authenticated members.
 *
 * This E2E test validates the complete media file retrieval workflow including:
 *
 * 1. Member account creation and authentication
 * 2. Media file upload with comprehensive metadata
 * 3. Media file retrieval with full metadata validation
 * 4. Verification of member and session context information
 * 5. Type safety and data integrity checks
 *
 * The test ensures that authenticated members can access their own uploaded
 * media files with complete metadata including file name, type, size, storage
 * path, processing status, optimization level, and version information.
 */
export async function test_api_member_media_file_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create member account for authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "TestPassword123";

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
      href: "https://example.com/registration",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Upload a test media file
  const mediaFileData = {
    file_name: "test-image.jpg",
    file_type: "image/jpeg",
    file_size: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    storage_path: "/uploads/images/test-image.jpg",
    optimization_level: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >(),
  } satisfies ICommunityPlatformMediaFile.ICreate;

  const uploadedMediaFile =
    await api.functional.communityPlatform.member.mediaFiles.create(
      connection,
      {
        body: mediaFileData,
      },
    );
  typia.assert(uploadedMediaFile);

  // Step 3: Retrieve the uploaded media file
  const retrievedMediaFile =
    await api.functional.communityPlatform.member.mediaFiles.at(connection, {
      mediaFileId: uploadedMediaFile.id,
    });
  typia.assert(retrievedMediaFile);

  // Step 4: Validate metadata integrity
  TestValidator.equals(
    "file name matches",
    retrievedMediaFile.file_name,
    mediaFileData.file_name,
  );
  TestValidator.equals(
    "file type matches",
    retrievedMediaFile.file_type,
    mediaFileData.file_type,
  );
  TestValidator.equals(
    "file size matches",
    retrievedMediaFile.file_size,
    mediaFileData.file_size,
  );
  TestValidator.equals(
    "storage path matches",
    retrievedMediaFile.storage_path,
    mediaFileData.storage_path,
  );
  TestValidator.equals(
    "optimization level matches",
    retrievedMediaFile.optimization_level,
    mediaFileData.optimization_level,
  );

  // Step 5: Validate processing status and version tracking
  TestValidator.predicate(
    "status should be set",
    retrievedMediaFile.status.length > 0,
  );
  TestValidator.predicate(
    "version should be positive",
    retrievedMediaFile.version > 0,
  );

  // Step 6: Validate member context information
  TestValidator.predicate(
    "member information should be included",
    retrievedMediaFile.member !== undefined,
  );
  if (retrievedMediaFile.member) {
    TestValidator.equals(
      "member ID matches uploader",
      retrievedMediaFile.member.id,
      member.id,
    );
    TestValidator.equals(
      "member email matches",
      retrievedMediaFile.member.email,
      member.email,
    );
    TestValidator.equals(
      "member display name matches",
      retrievedMediaFile.member.display_name,
      member.display_name,
    );
  }

  // Step 7: Validate session context information
  TestValidator.predicate(
    "session information should be included",
    retrievedMediaFile.session !== undefined,
  );
  if (retrievedMediaFile.session) {
    TestValidator.predicate(
      "session should have IP address",
      retrievedMediaFile.session.ip.length > 0,
    );
    TestValidator.predicate(
      "session should have href",
      retrievedMediaFile.session.href.length > 0,
    );
    TestValidator.predicate(
      "session should have referrer",
      retrievedMediaFile.session.referrer.length > 0,
    );
  }

  // Step 8: Validate timestamp information
  TestValidator.predicate(
    "created at timestamp should be set",
    retrievedMediaFile.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated at timestamp should be set",
    retrievedMediaFile.updated_at.length > 0,
  );

  // Step 9: Validate foreign key relationships
  TestValidator.equals(
    "member foreign key matches",
    retrievedMediaFile.community_platform_member_id,
    member.id,
  );
  TestValidator.predicate(
    "session foreign key should be set",
    retrievedMediaFile.community_platform_member_session_id.length > 0,
  );
}
