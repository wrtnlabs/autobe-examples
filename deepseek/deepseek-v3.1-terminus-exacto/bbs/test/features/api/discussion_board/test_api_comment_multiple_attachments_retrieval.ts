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

export async function test_api_comment_multiple_attachments_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Note: In a real scenario, we would need to create or retrieve an existing section
  // For testing purposes, we'll use a valid UUID format
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  // Create an article for testing
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
        section_id: sectionId,
        status: "published" as const,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Add a comment to the article
  const comment =
    await generate_random_discussion_board_user_articles_comments_create(
      userConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardComment.ICreate,
        params: {
          articleId: article.id,
        },
      },
    );
  typia.assert(comment);
  // Upload first file attachment to the article
  const firstFile =
    await generate_random_discussion_board_user_articles_files_create(
      userConnection,
      {
        body: {
          file_name: `file1_${RandomGenerator.alphabets(5)}.txt`,
          file_type: "text/plain",
          file_size: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<100>
          >(),
          storage_path: `/uploads/${typia.random<string & tags.Format<"uuid">>()}.txt`,
          description: "First test file attachment",
        } satisfies IDiscussionBoardArticleFile.ICreate,
        params: {
          articleId: article.id,
        },
      },
    );
  typia.assert(firstFile);
  // Upload second file attachment to the article
  const secondFile =
    await generate_random_discussion_board_user_articles_files_create(
      userConnection,
      {
        body: {
          file_name: `file2_${RandomGenerator.alphabets(5)}.pdf`,
          file_type: "application/pdf",
          file_size: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1000> &
              tags.Maximum<5000>
          >(),
          storage_path: `/uploads/${typia.random<string & tags.Format<"uuid">>()}.pdf`,
          description: "Second test file attachment",
        } satisfies IDiscussionBoardArticleFile.ICreate,
        params: {
          articleId: article.id,
        },
      },
    );
  typia.assert(secondFile);
  // Link first file attachment to the comment
  const firstAttachment =
    await generate_random_discussion_board_user_articles_comments_attachments_create(
      userConnection,
      {
        body: {
          discussion_board_article_file_id: firstFile.id,
        } satisfies IDiscussionBoardCommentAttachment.ICreate,
        params: {
          articleId: article.id,
          commentId: comment.id,
        },
      },
    );
  typia.assert(firstAttachment);
  // Link second file attachment to the comment
  const secondAttachment =
    await generate_random_discussion_board_user_articles_comments_attachments_create(
      userConnection,
      {
        body: {
          discussion_board_article_file_id: secondFile.id,
        } satisfies IDiscussionBoardCommentAttachment.ICreate,
        params: {
          articleId: article.id,
          commentId: comment.id,
        },
      },
    );
  typia.assert(secondAttachment);
  // Retrieve first attachment individually
  const retrievedFirstAttachment =
    await api.functional.discussionBoard.articles.comments.attachments.at(
      userConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        attachmentId: firstAttachment.id,
      },
    );
  typia.assert(retrievedFirstAttachment);
  // Retrieve second attachment individually
  const retrievedSecondAttachment =
    await api.functional.discussionBoard.articles.comments.attachments.at(
      userConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        attachmentId: secondAttachment.id,
      },
    );
  typia.assert(retrievedSecondAttachment);
  // Validate that correct attachment metadata is returned for each ID
  TestValidator.equals(
    "first attachment ID matches",
    retrievedFirstAttachment.id,
    firstAttachment.id,
  );
  TestValidator.equals(
    "first attachment file ID matches",
    retrievedFirstAttachment.file.id,
    firstFile.id,
  );
  TestValidator.equals(
    "first attachment file name matches",
    retrievedFirstAttachment.file.file_name,
    firstFile.fileName,
  );
  TestValidator.equals(
    "second attachment ID matches",
    retrievedSecondAttachment.id,
    secondAttachment.id,
  );
  TestValidator.equals(
    "second attachment file ID matches",
    retrievedSecondAttachment.file.id,
    secondFile.id,
  );
  TestValidator.equals(
    "second attachment file name matches",
    retrievedSecondAttachment.file.file_name,
    secondFile.fileName,
  );
  // Verify that attachments are distinct
  TestValidator.notEquals(
    "attachment IDs should be different",
    firstAttachment.id,
    secondAttachment.id,
  );
  TestValidator.notEquals(
    "file IDs should be different",
    firstFile.id,
    secondFile.id,
  );
  TestValidator.notEquals(
    "file names should be different",
    firstFile.fileName,
    secondFile.fileName,
  );
}
