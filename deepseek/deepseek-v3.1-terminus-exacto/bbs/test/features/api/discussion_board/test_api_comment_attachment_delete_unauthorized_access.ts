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

export async function test_api_comment_attachment_delete_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Create first user connection and register
  const firstUserConnection: api.IConnection = { host: connection.host };
  const firstUser = await authorize_user_join(firstUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(firstUser);
  // Create second user connection and register
  const secondUserConnection: api.IConnection = { host: connection.host };
  const secondUser = await authorize_user_join(secondUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(secondUser);
  // First user creates an article
  const article = await generate_random_discussion_board_user_articles_create(
    firstUserConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
        section_id: typia.random<string & tags.Format<"uuid">>(),
        status: "published" as const,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // First user creates a comment on the article
  const comment =
    await generate_random_discussion_board_user_articles_comments_create(
      firstUserConnection,
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
  // First user uploads a file to the article
  const file =
    await generate_random_discussion_board_user_articles_files_create(
      firstUserConnection,
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
  // First user links the file to their comment
  const attachment =
    await generate_random_discussion_board_user_articles_comments_attachments_create(
      firstUserConnection,
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
  // Second user attempts to delete the attachment (should fail)
  await TestValidator.error(
    "unauthorized user cannot delete comment attachment",
    async () => {
      await api.functional.discussionBoard.user.articles.comments.attachments.erase(
        secondUserConnection,
        {
          articleId: article.id,
          commentId: comment.id,
          attachmentId: attachment.id,
        },
      );
    },
  );
  // Verify attachment still exists by having the original user delete it successfully
  await api.functional.discussionBoard.user.articles.comments.attachments.erase(
    firstUserConnection,
    {
      articleId: article.id,
      commentId: comment.id,
      attachmentId: attachment.id,
    },
  );
}
