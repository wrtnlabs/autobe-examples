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
 * Test that guest users can download file attachment metadata from public articles without authentication.
 *
 * Test Steps:
 * 1. Administrator creates a discussion board section
 * 2. Member registers and logs in
 * 3. Member creates a public article with a file attachment in the section
 * 4. Guest user (no authentication) attempts to download the file metadata from the public article
 * 5. Guest receives the file metadata including URI, original filename, MIME type, and size
 *
 * Validation Points:
 * - Verify guest users can access file metadata without authentication
 * - Verify the response contains all required file metadata fields
 * - Verify the storage URI is accessible and properly formatted
 * - Verify the original filename is preserved for download naming
 * - Confirm public articles allow file downloads by any user including guests
 */
export async function test_api_article_file_download_by_guest(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator creates a section
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
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
  const section = await api.functional.discussionBoard.admin.sections.create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 2,
          wordMax: 4,
        }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // 2. Member registers and logs in
  const memberConnection: api.IConnection = { host: connection.host };
  const memberJoin = await authorize_member_join(memberConnection, {
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
  typia.assert(memberJoin);
  // 3. Member creates an article with file attachment
  const article = await api.functional.discussionBoard.member.articles.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 3,
          wordMax: 6,
        }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        sectionId: section.id,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 4. Member uploads a file attachment to the article using utility function
  const fileAttachment =
    await generate_random_discussion_board_member_articles_files_create(
      memberConnection,
      {
        params: { articleId: article.id },
        body: {
          name: `file_${typia.random<string & tags.Format<"uuid">>()}`,
          original_name: `${RandomGenerator.name()}.pdf`,
          mime_type: "application/pdf",
          size: typia.random<
            number &
              tags.Type<"uint32"> &
              tags.Minimum<100> &
              tags.Maximum<1000000>
          >(),
          path: typia.random<string & tags.Format<"uri">>(),
        } satisfies IDiscussionBoardArticleFile.ICreate,
      },
    );
  typia.assert(fileAttachment);
  // 5. Guest (no authentication) downloads file metadata
  // Guest connection has no Authorization header - demonstrates public access
  const guestConnection: api.IConnection = { host: connection.host };
  const fileDownload =
    await api.functional.discussionBoard.articles.files.download(
      guestConnection,
      {
        articleId: article.id,
        fileId: fileAttachment.id,
      },
    );
  typia.assert(fileDownload);
  // 6. Validate file metadata matches the uploaded file
  TestValidator.equals(
    "URI matches storage path",
    fileDownload.uri,
    fileAttachment.path,
  );
  TestValidator.equals(
    "original filename preserved",
    fileDownload.originalName,
    fileAttachment.original_name,
  );
  TestValidator.equals(
    "MIME type matches",
    fileDownload.mimeType,
    fileAttachment.mime_type,
  );
  TestValidator.equals(
    "file size matches",
    fileDownload.size,
    fileAttachment.size,
  );
}
