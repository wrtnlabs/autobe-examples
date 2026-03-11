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
 * Test member article file download functionality.
 *
 * This test validates the complete workflow where a member:
 * 1. Creates an article in a section created by admin
 * 2. Attaches a file to the article
 * 3. Downloads the file metadata
 *
 * Validates that file metadata (URI, original name, MIME type, size) is correctly returned.
 */
export async function test_api_article_file_download_by_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create section for articles
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
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: `${RandomGenerator.alphabets(3)} Section`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(section);
  // 2. Member registration and login
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  // 3. Member creates an article
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        sectionId: section.id,
      },
    },
  );
  typia.assert(article);
  // 4. Member uploads a file attachment to the article
  const fileMetadata = {
    name: `${RandomGenerator.alphaNumeric(16)}.pdf`,
    original_name: `document_${RandomGenerator.alphaNumeric(8)}.pdf`,
    mime_type: "application/pdf",
    size: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1000> & tags.Maximum<10000000>
    >(),
    path: `https://storage.example.com/files/${RandomGenerator.alphaNumeric(32)}`,
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
  // 5. Member downloads the file metadata
  const downloadedFile =
    await api.functional.discussionBoard.articles.files.download(
      memberConnection,
      {
        articleId: article.id,
        fileId: fileAttachment.id,
      },
    );
  typia.assert(downloadedFile);
  // 6. Validate file metadata
  TestValidator.equals(
    "file URI matches storage path",
    downloadedFile.uri,
    fileMetadata.path,
  );
  TestValidator.equals(
    "original filename preserved",
    downloadedFile.originalName,
    fileMetadata.original_name,
  );
  TestValidator.equals(
    "MIME type matches",
    downloadedFile.mimeType,
    fileMetadata.mime_type,
  );
  TestValidator.equals(
    "file size accurate",
    downloadedFile.size,
    fileMetadata.size,
  );
  TestValidator.predicate(
    "URI is valid format",
    downloadedFile.uri.includes("://"),
  );
}
