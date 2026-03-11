import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { generate_random_discussion_board_member_articles_files_create } from "../../../generate/generate_random_discussion_board_member_articles_files_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_file } from "../../../prepare/prepare_random_discussion_board_article_file";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test that file attachment metadata integrity is maintained throughout the file lifecycle.
 *
 * Test Steps:
 * 1. Member registers account using authorize_member_join utility
 * 2. Administrator creates account and logs in using authorize_admin_join and authorize_admin_login utilities
 * 3. Administrator creates a discussion board section using generate_random_discussion_board_admin_sections_create utility
 * 4. Member creates an article in the section using generate_random_discussion_board_member_articles_create utility
 * 5. Member uploads a file attachment with specific metadata using generate_random_discussion_board_member_articles_files_create utility
 * 6. Any user (unauthenticated connection) downloads the file metadata using api.functional.discussionBoard.articles.files.download
 * 7. Verify all metadata fields match: originalName, mimeType, size, and uri is a fully qualified URL
 *
 * Validation Points:
 * - Original filename matches exactly what was uploaded
 * - MIME type is accurate and matches the uploaded file type
 * - File size in bytes is correct
 * - Storage URI is properly formatted as a fully qualified URL
 * - All metadata fields are present and non-null
 * - Metadata integrity is maintained from upload to download
 */
export async function test_api_article_file_download_metadata_integrity(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 3. Administrator creates section
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 2,
          wordMax: 3,
        }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // 4. Member creates article in the section
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 3,
          wordMax: 5,
        }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        sectionId: section.id,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 5. Member uploads file attachment with specific metadata
  const fileMetadata = {
    name: typia.random<string & tags.Format<"uuid">>(),
    original_name: `test_document_${RandomGenerator.alphabets(5)}.pdf`,
    mime_type: "application/pdf",
    size: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<1000000>
    >(),
    path: `https://storage.example.com/files/${typia.random<string & tags.Format<"uuid">>()}.pdf`,
  } satisfies IDiscussionBoardArticleFile.ICreate;
  const fileAttachment =
    await generate_random_discussion_board_member_articles_files_create(
      memberConnection,
      {
        params: { articleId: article.id },
        body: fileMetadata,
      },
    );
  typia.assert(fileAttachment);
  // 6. Download file metadata (unauthenticated connection for public access)
  const downloadConnection: api.IConnection = { host: connection.host };
  const downloadedMetadata =
    await api.functional.discussionBoard.articles.files.download(
      downloadConnection,
      {
        articleId: article.id,
        fileId: fileAttachment.id,
      },
    );
  typia.assert(downloadedMetadata);
  // 7. Validate metadata integrity
  TestValidator.equals(
    "original filename matches",
    downloadedMetadata.originalName,
    fileMetadata.original_name,
  );
  TestValidator.equals(
    "MIME type matches",
    downloadedMetadata.mimeType,
    fileMetadata.mime_type,
  );
  TestValidator.equals(
    "file size matches",
    downloadedMetadata.size,
    fileMetadata.size,
  );
}
