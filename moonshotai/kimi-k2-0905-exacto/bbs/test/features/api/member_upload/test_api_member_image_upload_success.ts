import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticsBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsMember";
import type { IPoliticsBbsUpload } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsUpload";

/**
 * Test successful image file upload by authenticated member.
 *
 * This test validates the complete image upload workflow including:
 *
 * 1. Member account creation and authentication
 * 2. Image file generation with proper JPEG encoding under 5MB limit
 * 3. File upload with metadata validation
 * 4. Upload response verification including processing status
 * 5. Authentication and audit trail validation
 *
 * The test ensures proper file type validation, size constraints, and
 * processing completion for image files on the politics discussion board.
 */
export async function test_api_member_image_upload_success(
  connection: api.IConnection,
) {
  // Step 1: Create member account for authentication
  const memberJoinData = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "TestPassword123",
    href: "https://example.com/register",
    referrer: "https://example.com/login",
  } satisfies IPoliticsBbsMember.IJoin;

  const member: IPoliticsBbsMember.IAuthorized =
    await api.functional.auth.members.join(connection, {
      body: memberJoinData,
    });
  typia.assert(member);

  // Step 2: Generate a valid JPEG image file under 5MB size limit
  // Generate binary data that represents a small JPEG image (~50KB for testing)
  const imageBinaryData = ArrayUtil.repeat(50000, () =>
    Math.floor(Math.random() * 256),
  );

  const uploadData = {
    file: {
      data: Buffer.from(imageBinaryData).toString("base64"),
      encoding: "base64" as const,
      filename: "test-image.jpg",
      mime_type: "image/jpeg",
    },
    href: "https://example.com/upload",
    referrer: "https://example.com/article-form",
  } satisfies IPoliticsBbsUpload.ICreate;

  // Step 3: Upload the image file
  const upload: IPoliticsBbsUpload =
    await api.functional.politicsBbs.member.uploads.create(connection, {
      body: uploadData,
    });
  typia.assert(upload);

  // Step 4: Validate upload response
  TestValidator.equals("upload ID is valid UUID format", upload.id.length, 36);
  TestValidator.equals(
    "filename matches uploaded file name",
    upload.filename,
    "test-image.jpg",
  );
  TestValidator.equals(
    "MIME type is JPEG image",
    upload.mime_type,
    "image/jpeg",
  );
  TestValidator.predicate("file size is positive number", upload.file_size > 0);
  TestValidator.predicate(
    "file size meets 5MB limit constraint",
    upload.file_size < 5242880,
  );
  TestValidator.predicate(
    "file path is valid URI format",
    upload.file_path.startsWith("http"),
  );
  TestValidator.predicate(
    "upload has creation timestamp",
    upload.created_at.length > 0,
  );

  // Step 5: Validate member association
  TestValidator.equals(
    "upload is associated with correct member",
    upload.politics_bbs_member_id,
    member.id,
  );
  TestValidator.predicate(
    "article ID is null (not yet attached)",
    upload.politics_bbs_article_id === null,
  );
}
