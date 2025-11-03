import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticsBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsMember";
import type { IPoliticsBbsUpload } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsUpload";

export async function test_api_member_document_upload_success(
  connection: api.IConnection,
) {
  // Create member account to authenticate
  const memberJoinBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123",
    href: "https://example.com/register",
    referrer: "https://example.com/home",
  } satisfies IPoliticsBbsMember.IJoin;

  const member = await api.functional.auth.members.join(connection, {
    body: memberJoinBody,
  });
  typia.assert(member);

  // Test successful PDF document upload
  const pdfUploadBody = {
    file: {
      data: "JVBERi0xLjQKJcOkw7zDtsOgCjIgMCBvYmoKPDwKL0xlbmd0aCAzIDAgUgo+PgpzdHJlYW0K",
      encoding: "base64" as const,
      filename: "test-document.pdf",
      mime_type: "application/pdf",
    },
    href: "https://example.com/upload",
    referrer: "https://example.com/article",
  } satisfies IPoliticsBbsUpload.ICreate;

  const pdfUpload = await api.functional.politicsBbs.member.uploads.create(
    connection,
    {
      body: pdfUploadBody,
    },
  );
  typia.assert(pdfUpload);

  TestValidator.equals(
    "PDF upload mime type",
    pdfUpload.mime_type,
    "application/pdf",
  );
  TestValidator.equals(
    "PDF upload filename",
    pdfUpload.filename,
    "test-document.pdf",
  );
  TestValidator.equals(
    "PDF upload member ID",
    pdfUpload.politics_bbs_member_id,
    member.id,
  );
  TestValidator.predicate("PDF upload has valid file path", () =>
    typia.is<string & tags.Format<"uri">>(pdfUpload.file_path),
  );
  TestValidator.predicate("PDF upload has valid created_at", () =>
    typia.is<string & tags.Format<"date-time">>(pdfUpload.created_at),
  );

  // Test successful DOC document upload
  const docUploadBody = {
    file: {
      data: "0M8R4KGxGuEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      encoding: "base64" as const,
      filename: "test-document.doc",
      mime_type: "application/msword",
    },
    href: "https://example.com/upload",
    referrer: "https://example.com/article",
  } satisfies IPoliticsBbsUpload.ICreate;

  const docUpload = await api.functional.politicsBbs.member.uploads.create(
    connection,
    {
      body: docUploadBody,
    },
  );
  typia.assert(docUpload);

  TestValidator.equals(
    "DOC upload mime type",
    docUpload.mime_type,
    "application/msword",
  );
  TestValidator.equals(
    "DOC upload filename",
    docUpload.filename,
    "test-document.doc",
  );
  TestValidator.equals(
    "DOC upload member ID",
    docUpload.politics_bbs_member_id,
    member.id,
  );
  TestValidator.predicate("DOC upload has valid file path", () =>
    typia.is<string & tags.Format<"uri">>(docUpload.file_path),
  );
  TestValidator.predicate("DOC upload has valid created_at", () =>
    typia.is<string & tags.Format<"date-time">>(docUpload.created_at),
  );

  // Test successful DOCX document upload
  const docxUploadBody = {
    file: {
      data: "UEsDBBQABgAIAAAAIQDfpNJsWgEAACAFAAATAAgCW0NvbnRlbnRfVHlwZXNdLnhtbCCiBAIooAAC",
      encoding: "base64" as const,
      filename: "test-document.docx",
      mime_type:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    },
    href: "https://example.com/upload",
    referrer: "https://example.com/article",
  } satisfies IPoliticsBbsUpload.ICreate;

  const docxUpload = await api.functional.politicsBbs.member.uploads.create(
    connection,
    {
      body: docxUploadBody,
    },
  );
  typia.assert(docxUpload);

  TestValidator.equals(
    "DOCX upload mime type",
    docxUpload.mime_type,
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  );
  TestValidator.equals(
    "DOCX upload filename",
    docxUpload.filename,
    "test-document.docx",
  );
  TestValidator.equals(
    "DOCX upload member ID",
    docxUpload.politics_bbs_member_id,
    member.id,
  );
  TestValidator.predicate("DOCX upload has valid file path", () =>
    typia.is<string & tags.Format<"uri">>(docxUpload.file_path),
  );
  TestValidator.predicate("DOCX upload has valid created_at", () =>
    typia.is<string & tags.Format<"date-time">>(docxUpload.created_at),
  );

  // Test successful TXT document upload
  const txtUploadBody = {
    file: {
      data: "dGVzdCBkb2N1bWVudCBjb250ZW50IGZvciB0ZXh0IGZpbGU=",
      encoding: "base64" as const,
      filename: "test-document.txt",
      mime_type: "text/plain",
    },
    href: "https://example.com/upload",
    referrer: "https://example.com/article",
  } satisfies IPoliticsBbsUpload.ICreate;

  const txtUpload = await api.functional.politicsBbs.member.uploads.create(
    connection,
    {
      body: txtUploadBody,
    },
  );
  typia.assert(txtUpload);

  TestValidator.equals(
    "TXT upload mime type",
    txtUpload.mime_type,
    "text/plain",
  );
  TestValidator.equals(
    "TXT upload filename",
    txtUpload.filename,
    "test-document.txt",
  );
  TestValidator.equals(
    "TXT upload member ID",
    txtUpload.politics_bbs_member_id,
    member.id,
  );
  TestValidator.predicate("TXT upload has valid file path", () =>
    typia.is<string & tags.Format<"uri">>(txtUpload.file_path),
  );
  TestValidator.predicate("TXT upload has valid created_at", () =>
    typia.is<string & tags.Format<"date-time">>(txtUpload.created_at),
  );

  // Verify all uploads have valid IDs and file metadata
  TestValidator.predicate("PDF upload has valid ID", () =>
    typia.is<string & tags.Format<"uuid">>(pdfUpload.id),
  );
  TestValidator.predicate("DOC upload has valid ID", () =>
    typia.is<string & tags.Format<"uuid">>(docUpload.id),
  );
  TestValidator.predicate("DOCX upload has valid ID", () =>
    typia.is<string & tags.Format<"uuid">>(docxUpload.id),
  );
  TestValidator.predicate("TXT upload has valid ID", () =>
    typia.is<string & tags.Format<"uuid">>(txtUpload.id),
  );
}
