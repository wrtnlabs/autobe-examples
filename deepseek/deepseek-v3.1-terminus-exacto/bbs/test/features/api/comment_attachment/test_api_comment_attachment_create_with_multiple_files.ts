import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentAttachment";
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
import { generate_random_discussion_board_user_articles_comments_attachments_create } from "../../../generate/generate_random_discussion_board_user_articles_comments_attachments_create";
import { generate_random_discussion_board_user_articles_comments_create } from "../../../generate/generate_random_discussion_board_user_articles_comments_create";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { generate_random_discussion_board_user_articles_files_create } from "../../../generate/generate_random_discussion_board_user_articles_files_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_file } from "../../../prepare/prepare_random_discussion_board_article_file";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";
import { prepare_random_discussion_board_comment_attachment } from "../../../prepare/prepare_random_discussion_board_comment_attachment";

export async function test_api_comment_attachment_create_with_multiple_files(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user);
  // Create an article (section_id will be handled by the generation function)
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
        status: "published" as const,
        section_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Upload three different file types
  const documentFile =
    await generate_random_discussion_board_user_articles_files_create(
      userConnection,
      {
        params: { articleId: article.id },
        body: {
          file_name: "document.docx",
          file_type:
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          file_size: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1000> &
              tags.Maximum<5000000>
          >(),
          storage_path: "/files/documents/document.docx",
          description: "Test document file",
        } satisfies IDiscussionBoardArticleFile.ICreate,
      },
    );
  typia.assert(documentFile);
  const imageFile =
    await generate_random_discussion_board_user_articles_files_create(
      userConnection,
      {
        params: { articleId: article.id },
        body: {
          file_name: "image.jpg",
          file_type: "image/jpeg",
          file_size: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<50000> &
              tags.Maximum<2000000>
          >(),
          storage_path: "/files/images/image.jpg",
          description: "Test image file",
        } satisfies IDiscussionBoardArticleFile.ICreate,
      },
    );
  typia.assert(imageFile);
  const pdfFile =
    await generate_random_discussion_board_user_articles_files_create(
      userConnection,
      {
        params: { articleId: article.id },
        body: {
          file_name: "document.pdf",
          file_type: "application/pdf",
          file_size: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<100000> &
              tags.Maximum<10000000>
          >(),
          storage_path: "/files/documents/document.pdf",
          description: "Test PDF file",
        } satisfies IDiscussionBoardArticleFile.ICreate,
      },
    );
  typia.assert(pdfFile);
  // Create a comment
  const comment =
    await generate_random_discussion_board_user_articles_comments_create(
      userConnection,
      {
        params: { articleId: article.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);
  // Attach each file to the comment sequentially
  const attachment1 =
    await generate_random_discussion_board_user_articles_comments_attachments_create(
      userConnection,
      {
        params: { articleId: article.id, commentId: comment.id },
        body: {
          discussion_board_article_file_id: documentFile.id,
        } satisfies IDiscussionBoardCommentAttachment.ICreate,
      },
    );
  typia.assert(attachment1);
  const attachment2 =
    await generate_random_discussion_board_user_articles_comments_attachments_create(
      userConnection,
      {
        params: { articleId: article.id, commentId: comment.id },
        body: {
          discussion_board_article_file_id: imageFile.id,
        } satisfies IDiscussionBoardCommentAttachment.ICreate,
      },
    );
  typia.assert(attachment2);
  const attachment3 =
    await generate_random_discussion_board_user_articles_comments_attachments_create(
      userConnection,
      {
        params: { articleId: article.id, commentId: comment.id },
        body: {
          discussion_board_article_file_id: pdfFile.id,
        } satisfies IDiscussionBoardCommentAttachment.ICreate,
      },
    );
  typia.assert(attachment3);
  // Validate that each attachment has distinct IDs and proper file metadata
  TestValidator.notEquals(
    "attachment IDs should be distinct",
    attachment1.id,
    attachment2.id,
  );
  TestValidator.notEquals(
    "attachment IDs should be distinct",
    attachment1.id,
    attachment3.id,
  );
  TestValidator.notEquals(
    "attachment IDs should be distinct",
    attachment2.id,
    attachment3.id,
  );
  TestValidator.equals(
    "first attachment should reference document file",
    attachment1.file.id,
    documentFile.id,
  );
  TestValidator.equals(
    "second attachment should reference image file",
    attachment2.file.id,
    imageFile.id,
  );
  TestValidator.equals(
    "third attachment should reference PDF file",
    attachment3.file.id,
    pdfFile.id,
  );
  TestValidator.equals(
    "all attachments should reference the same comment",
    attachment1.comment.id,
    comment.id,
  );
  TestValidator.equals(
    "all attachments should reference the same comment",
    attachment2.comment.id,
    comment.id,
  );
  TestValidator.equals(
    "all attachments should reference the same comment",
    attachment3.comment.id,
    comment.id,
  );
  // Validate file metadata
  TestValidator.equals(
    "document file name should match",
    attachment1.file.file_name,
    "document.docx",
  );
  TestValidator.equals(
    "image file name should match",
    attachment2.file.file_name,
    "image.jpg",
  );
  TestValidator.equals(
    "PDF file name should match",
    attachment3.file.file_name,
    "document.pdf",
  );
  TestValidator.equals(
    "document file type should be correct",
    attachment1.file.file_type,
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  );
  TestValidator.equals(
    "image file type should be correct",
    attachment2.file.file_type,
    "image/jpeg",
  );
  TestValidator.equals(
    "PDF file type should be correct",
    attachment3.file.file_type,
    "application/pdf",
  );
  TestValidator.predicate(
    "document file size should be positive",
    attachment1.file.file_size > 0,
  );
  TestValidator.predicate(
    "image file size should be positive",
    attachment2.file.file_size > 0,
  );
  TestValidator.predicate(
    "PDF file size should be positive",
    attachment3.file.file_size > 0,
  );
}