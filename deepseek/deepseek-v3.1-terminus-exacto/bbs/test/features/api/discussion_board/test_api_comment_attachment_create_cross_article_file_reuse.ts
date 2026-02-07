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

/**
 * Test API comment attachment create cross article file reuse.
 * Validates file attachment reuse across different articles and comments.
 */
export async function test_api_comment_attachment_create_cross_article_file_reuse(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection with authentication
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
  // Note: In production, section_id should reference existing sections
  // For test purposes, using random UUIDs but real implementation should validate section existence
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  // Create first article with file attachment
  const article1 = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.paragraph({ sentences: 5 }),
        section_id: sectionId,
        status: "published" as const,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article1);
  const file1 =
    await generate_random_discussion_board_user_articles_files_create(
      userConnection,
      {
        params: { articleId: article1.id },
        body: {
          file_name: `${RandomGenerator.alphabets(10)}.txt`,
          file_type: "text/plain",
          file_size: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<5000>
          >(),
          storage_path: `/files/${typia.random<string & tags.Format<"uuid">>()}`,
          description: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardArticleFile.ICreate,
      },
    );
  typia.assert(file1);
  // Create second article with different file attachment
  const article2 = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.paragraph({ sentences: 5 }),
        section_id: sectionId,
        status: "published" as const,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article2);
  const file2 =
    await generate_random_discussion_board_user_articles_files_create(
      userConnection,
      {
        params: { articleId: article2.id },
        body: {
          file_name: `${RandomGenerator.alphabets(8)}.pdf`,
          file_type: "application/pdf",
          file_size: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1000> &
              tags.Maximum<10000>
          >(),
          storage_path: `/files/${typia.random<string & tags.Format<"uuid">>()}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardArticleFile.ICreate,
      },
    );
  typia.assert(file2);
  // Create comment on first article
  const comment =
    await generate_random_discussion_board_user_articles_comments_create(
      userConnection,
      {
        params: { articleId: article1.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);
  // Attach first file (from first article) to comment
  const attachment1 =
    await generate_random_discussion_board_user_articles_comments_attachments_create(
      userConnection,
      {
        params: { articleId: article1.id, commentId: comment.id },
        body: {
          discussion_board_article_file_id: file1.id,
        } satisfies IDiscussionBoardCommentAttachment.ICreate,
      },
    );
  typia.assert(attachment1);
  // Attach second file (from different article) to same comment
  const attachment2 =
    await generate_random_discussion_board_user_articles_comments_attachments_create(
      userConnection,
      {
        params: { articleId: article1.id, commentId: comment.id },
        body: {
          discussion_board_article_file_id: file2.id,
        } satisfies IDiscussionBoardCommentAttachment.ICreate,
      },
    );
  typia.assert(attachment2);
  // Validate file attachment properties are maintained
  TestValidator.equals("first file ID matches", attachment1.file.id, file1.id);
  TestValidator.equals("second file ID matches", attachment2.file.id, file2.id);
  TestValidator.equals(
    "first file name unchanged",
    attachment1.file.file_name,
    file1.fileName,
  );
  TestValidator.equals(
    "second file name unchanged",
    attachment2.file.file_name,
    file2.fileName,
  );
  TestValidator.equals(
    "first file type unchanged",
    attachment1.file.file_type,
    file1.fileType,
  );
  TestValidator.equals(
    "second file type unchanged",
    attachment2.file.file_type,
    file2.fileType,
  );
  TestValidator.equals(
    "first file size unchanged",
    attachment1.file.file_size,
    file1.fileSize satisfies number as number,
  );
  TestValidator.equals(
    "second file size unchanged",
    attachment2.file.file_size,
    file2.fileSize satisfies number as number,
  );
  TestValidator.notEquals(
    "files are different",
    attachment1.file.id,
    attachment2.file.id,
  );
  // Validate comment attribution
  TestValidator.equals(
    "comment ID matches for both attachments",
    attachment1.comment.id,
    attachment2.comment.id,
  );
  TestValidator.equals(
    "comment content matches",
    attachment1.comment.content,
    comment.content,
  );
}
