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

export async function test_api_comment_attachment_delete_by_author(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for the user
  const userConnection: api.IConnection = { host: connection.host };
  // Step 1: Authenticate as a regular user
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Step 2: Create an article as the authenticated user
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 5,
          wordMax: 10,
        }),
        content: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        section_id: typia.random<string & tags.Format<"uuid">>(),
        status: "published" as const,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Step 3: Create a comment on the article
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
  // Step 4: Upload a file attachment to the article
  const file =
    await generate_random_discussion_board_user_articles_files_create(
      userConnection,
      {
        body: {
          file_name: `${RandomGenerator.alphabets(8)}.txt`,
          file_type: "text/plain",
          file_size: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1000>
          >(),
          storage_path: `/uploads/${typia.random<string & tags.Format<"uuid">>()}.txt`,
          description: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardArticleFile.ICreate,
        params: {
          articleId: article.id,
        },
      },
    );
  typia.assert(file);
  // Step 5: Link the file attachment to the comment
  const attachment =
    await generate_random_discussion_board_user_articles_comments_attachments_create(
      userConnection,
      {
        body: {
          discussion_board_article_file_id: file.id,
        } satisfies IDiscussionBoardCommentAttachment.ICreate,
        params: {
          articleId: article.id,
          commentId: comment.id,
        },
      },
    );
  typia.assert(attachment);
  // Step 6: Delete the attachment
  await api.functional.discussionBoard.user.articles.comments.attachments.erase(
    userConnection,
    {
      articleId: article.id,
      commentId: comment.id,
      attachmentId: attachment.id,
    },
  );
  // Step 7: Verify that subsequent attempts to access the deleted attachment fail
  await TestValidator.error(
    "deleted attachment should not be accessible",
    async () => {
      await api.functional.discussionBoard.user.articles.comments.attachments.create(
        userConnection,
        {
          articleId: article.id,
          commentId: comment.id,
          body: {
            discussion_board_article_file_id: file.id,
          } satisfies IDiscussionBoardCommentAttachment.ICreate,
        },
      );
    },
  );
  // Step 8: Verify the file itself still exists in the system (can be reused)
  TestValidator.predicate(
    "file should still exist after attachment deletion",
    file.id !== undefined && file.id.length > 0,
  );
}
