import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { generate_random_discussion_board_user_articles_files_create } from "../../../generate/generate_random_discussion_board_user_articles_files_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_file } from "../../../prepare/prepare_random_discussion_board_article_file";

export async function test_api_article_file_attachment_successful_upload(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(authorizedUser);
  // Create an article as the authenticated user using utility function
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        section_id: typia.random<string & tags.Format<"uuid">>(),
        status: "published" as "draft" | "published" | "archived",
      },
    },
  );
  typia.assert(article);
  // Prepare file attachment data
  const fileAttachmentBody = {
    file_name: "test_document.pdf",
    file_type: "application/pdf",
    file_size: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1000> & tags.Maximum<50000>
    >(),
    storage_path:
      "/uploads/articles/" +
      typia.random<string & tags.Format<"uuid">>() +
      ".pdf",
    description: "Test PDF document for article attachment",
  } satisfies IDiscussionBoardArticleFile.ICreate;
  // Attach file to the created article
  const fileAttachment =
    await api.functional.discussionBoard.user.articles.files.create(
      userConnection,
      {
        articleId: article.id,
        body: fileAttachmentBody,
      },
    );
  typia.assert(fileAttachment);
  // Validate file attachment metadata
  TestValidator.equals(
    "file attachment id should be generated",
    typeof fileAttachment.id,
    "string",
  );
  TestValidator.equals(
    "file name should match input",
    fileAttachment.fileName,
    fileAttachmentBody.file_name,
  );
  TestValidator.equals(
    "file type should match input",
    fileAttachment.fileType,
    fileAttachmentBody.file_type,
  );
  TestValidator.equals(
    "file size should match input",
    fileAttachment.fileSize,
    fileAttachmentBody.file_size,
  );
  TestValidator.equals(
    "storage path should match input",
    fileAttachment.storagePath,
    fileAttachmentBody.storage_path,
  );
  TestValidator.equals(
    "description should match input",
    fileAttachment.description,
    fileAttachmentBody.description,
  );
  TestValidator.equals(
    "download count should be zero",
    fileAttachment.downloadCount,
    0,
  );
  TestValidator.predicate(
    "uploaded by should track user",
    fileAttachment.uploadedBy === authorizedUser.id,
  );
  TestValidator.predicate(
    "created at should be populated",
    fileAttachment.createdAt !== null,
  );
  TestValidator.predicate(
    "updated at should be populated",
    fileAttachment.updatedAt !== null,
  );
  TestValidator.predicate(
    "deleted at should be null",
    fileAttachment.deletedAt === null,
  );
}
