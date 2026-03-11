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
import { generate_random_discussion_board_admin_articles_files_create } from "../../../generate/generate_random_discussion_board_admin_articles_files_create";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_file } from "../../../prepare/prepare_random_discussion_board_article_file";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_article_file_attachment_with_valid_metadata(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin registration with stored credentials
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminJoinResult = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminJoinResult);
  // 2. Admin login with stored credentials
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  // 3. Create section for article categorization
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // 4. Create article to attach file to
  const article = await generate_random_discussion_board_member_articles_create(
    adminConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        sectionId: section.id,
        tags: ["test", "file-attachment"],
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 5. Prepare file metadata for attachment
  const fileUuid = typia.random<string & tags.Format<"uuid">>();
  const fileSize = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10485760>
  >();
  const filePath = `https://cdn.example.com/files/${fileUuid}.pdf`;
  // 6. Attach file with complete metadata
  const fileAttachment =
    await generate_random_discussion_board_admin_articles_files_create(
      adminConnection,
      {
        params: { articleId: article.id },
        body: {
          name: fileUuid,
          original_name: "test-document.pdf",
          mime_type: "application/pdf",
          size: fileSize,
          path: filePath,
        } satisfies IDiscussionBoardArticleFile.ICreate,
      },
    );
  typia.assert(fileAttachment);
  // 7. Validate file attachment metadata
  TestValidator.equals(
    "stored filename matches",
    fileAttachment.name,
    fileUuid,
  );
  TestValidator.equals(
    "original name preserved",
    fileAttachment.original_name,
    "test-document.pdf",
  );
  TestValidator.equals(
    "mime type correct",
    fileAttachment.mime_type,
    "application/pdf",
  );
  TestValidator.equals(
    "file size matches input",
    fileAttachment.size,
    fileSize,
  );
  TestValidator.predicate("file size is positive", fileAttachment.size > 0);
  TestValidator.predicate(
    "file size within limits",
    fileAttachment.size <= 10485760,
  );
  TestValidator.equals("storage path correct", fileAttachment.path, filePath);
  TestValidator.predicate(
    "path is valid CDN URL",
    fileAttachment.path.startsWith("https://"),
  );
  TestValidator.equals(
    "article linked correctly",
    fileAttachment.article.id,
    article.id,
  );
  TestValidator.equals(
    "member linked correctly",
    fileAttachment.member.id,
    adminJoinResult.member.id,
  );
  TestValidator.predicate(
    "created timestamp exists",
    fileAttachment.created_at !== null,
  );
  TestValidator.predicate(
    "updated timestamp exists",
    fileAttachment.updated_at !== null,
  );
  TestValidator.equals("file not deleted", fileAttachment.deleted_at, null);
}
