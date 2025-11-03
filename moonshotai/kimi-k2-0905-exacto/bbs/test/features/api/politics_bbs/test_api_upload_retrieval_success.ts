import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticsBbsArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsArticle";
import type { IPoliticsBbsArticleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsArticleSnapshot";
import type { IPoliticsBbsAttachmentOfMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsAttachmentOfMember";
import type { IPoliticsBbsAttachmentOfModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsAttachmentOfModerator";
import type { IPoliticsBbsAttachmentOfVisitor } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsAttachmentOfVisitor";
import type { IPoliticsBbsCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsCategory";
import type { IPoliticsBbsComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsComment";
import type { IPoliticsBbsFileAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsFileAttachment";
import type { IPoliticsBbsImageAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsImageAttachment";
import type { IPoliticsBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsMember";
import type { IPoliticsBbsModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsModerator";
import type { IPoliticsBbsUpload } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsUpload";
import type { IPoliticsBbsVisitor } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsVisitor";

/**
 * Test successful retrieval of uploaded file metadata after file upload.
 *
 * This test validates the complete file management workflow from upload to
 * metadata access, ensuring users can view attachment details after successful
 * uploads. The scenario covers:
 *
 * 1. Member registration and authentication
 * 2. File upload with proper metadata
 * 3. Metadata retrieval using upload ID
 * 4. Validation of retrieved file information
 */
export async function test_api_upload_retrieval_success(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account for authentication
  const joinRequest = {
    username: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://example.com/register",
    referrer: "https://example.com/home",
  } satisfies IPoliticsBbsMember.IJoin;

  const member = await api.functional.auth.members.join(connection, {
    body: joinRequest,
  });
  typia.assert(member);

  // Step 2: Upload a sample file to create an upload record
  const fileContent = "data:text/plain;base64,SGVsbG8gV29ybGQh";
  const uploadRequest = {
    file: {
      data: fileContent,
      encoding: "base64" as const,
      filename: "test-document.txt",
      mime_type: "text/plain",
    },
    href: "https://example.com/upload",
    referrer: "https://example.com/article",
  } satisfies IPoliticsBbsUpload.ICreate;

  const upload = await api.functional.politicsBbs.member.uploads.create(
    connection,
    {
      body: uploadRequest,
    },
  );
  typia.assert(upload);

  // Step 3: Retrieve the uploaded file's metadata using the upload ID
  const retrievedUpload = await api.functional.politicsBbs.uploads.at(
    connection,
    {
      uploadId: upload.id,
    },
  );
  typia.assert(retrievedUpload);

  // Step 4: Validate that retrieved metadata matches the original upload
  TestValidator.equals("upload ID matches", retrievedUpload.id, upload.id);
  TestValidator.equals(
    "filename matches",
    retrievedUpload.filename,
    "test-document.txt",
  );
  TestValidator.equals(
    "MIME type matches",
    retrievedUpload.mime_type,
    "text/plain",
  );
  TestValidator.predicate(
    "file size is positive",
    retrievedUpload.file_size > 0,
  );
  TestValidator.predicate(
    "upload has creation timestamp",
    retrievedUpload.created_at.length > 0,
  );
  TestValidator.predicate(
    "file path is valid URI",
    retrievedUpload.file_path.length > 0,
  );
}
