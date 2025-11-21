import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformMediaFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMediaFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberSession";

/**
 * Test successful media file upload workflow for authenticated members.
 * Validates that members can upload media files with proper metadata including
 * filename, file type, file size, and storage path. The test verifies that the
 * system correctly processes the upload, assigns appropriate status, and
 * returns complete file information with member and session associations.
 */
export async function test_api_media_file_upload_by_member(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account for authentication context
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphabets(12);

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Prepare media file upload data
  const fileName = `test_file_${RandomGenerator.alphaNumeric(8)}.jpg`;
  const fileSize = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5000000>
  >();
  const storagePath = `/uploads/members/${member.id}/${RandomGenerator.alphaNumeric(16)}.jpg`;
  const optimizationLevel = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
  >();

  // Step 3: Upload media file using authenticated member connection
  const mediaFile =
    await api.functional.communityPlatform.member.mediaFiles.create(
      connection,
      {
        body: {
          file_name: fileName,
          file_type: "image/jpeg",
          file_size: fileSize,
          storage_path: storagePath,
          optimization_level: optimizationLevel,
        } satisfies ICommunityPlatformMediaFile.ICreate,
      },
    );
  typia.assert(mediaFile);

  // Step 4: Validate file metadata and associations
  TestValidator.predicate(
    "file ID should be valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      mediaFile.id,
    ),
  );
  TestValidator.equals(
    "file name should match input",
    mediaFile.file_name,
    fileName,
  );
  TestValidator.equals(
    "file type should match input",
    mediaFile.file_type,
    "image/jpeg",
  );
  TestValidator.equals(
    "file size should match input",
    mediaFile.file_size,
    fileSize,
  );
  TestValidator.equals(
    "storage path should match input",
    mediaFile.storage_path,
    storagePath,
  );
  TestValidator.predicate("status should be set", mediaFile.status.length > 0);
  TestValidator.equals("version should start at 1", mediaFile.version, 1);
  TestValidator.predicate(
    "created_at should be valid timestamp",
    new Date(mediaFile.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "updated_at should be valid timestamp",
    new Date(mediaFile.updated_at).getTime() > 0,
  );

  // Step 5: Validate member and session associations
  TestValidator.equals(
    "member ID should match uploading member",
    mediaFile.community_platform_member_id,
    member.id,
  );
  TestValidator.predicate(
    "member session ID should be valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      mediaFile.community_platform_member_session_id,
    ),
  );

  // Step 6: Validate optimization level
  TestValidator.equals(
    "optimization level should match input",
    mediaFile.optimization_level,
    optimizationLevel,
  );

  // Step 7: Validate member and session summary objects
  TestValidator.predicate(
    "member summary should be present",
    mediaFile.member !== undefined,
  );
  if (mediaFile.member) {
    TestValidator.equals(
      "member summary ID should match",
      mediaFile.member.id,
      member.id,
    );
    TestValidator.equals(
      "member summary email should match",
      mediaFile.member.email,
      member.email,
    );
  }

  TestValidator.predicate(
    "session summary should be present",
    mediaFile.session !== undefined,
  );
  if (mediaFile.session) {
    TestValidator.predicate(
      "session summary ID should be valid UUID format",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        mediaFile.session.id,
      ),
    );
  }
}
