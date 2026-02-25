import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
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
import { generate_random_discussion_board_user_articles_comments_create } from "../../../generate/generate_random_discussion_board_user_articles_comments_create";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";

export async function test_api_comment_update_own_content(
  connection: api.IConnection,
): Promise<void> {
  // 1. User registration and authentication
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user);
  // 2. Create an article for comment context (using section ID from existing setup)
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 1 }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 3. Create initial comment
  const initialCommentContent = RandomGenerator.paragraph({ sentences: 1 });
  const comment =
    await generate_random_discussion_board_user_articles_comments_create(
      userConnection,
      {
        body: {
          content: initialCommentContent,
        } satisfies IDiscussionBoardComment.ICreate,
        params: {
          articleId: article.id,
        },
      },
    );
  typia.assert(comment);
  // 4. Update comment with new content
  const updatedCommentContent = RandomGenerator.paragraph({ sentences: 2 });
  const updatedComment =
    await api.functional.discussionBoard.user.articles.comments.update(
      userConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          content: updatedCommentContent,
        } satisfies IDiscussionBoardComment.IUpdate,
      },
    );
  typia.assert(updatedComment);
  // 5. Validate update results
  TestValidator.equals(
    "comment id remains unchanged",
    updatedComment.id,
    comment.id,
  );
  TestValidator.equals(
    "author remains unchanged",
    updatedComment.author.id,
    comment.author.id,
  );
  TestValidator.equals(
    "article reference remains unchanged",
    updatedComment.article.id,
    comment.article.id,
  );
  TestValidator.equals(
    "content is updated",
    updatedComment.content,
    updatedCommentContent,
  );
  TestValidator.notEquals(
    "updated_at timestamp changes",
    updatedComment.updated_at,
    comment.updated_at,
  );
  TestValidator.predicate(
    "updated_at is recent",
    new Date(updatedComment.updated_at).getTime() > Date.now() - 60000,
  );
  // 6. Test authorization: user cannot update another user's comment
  const anotherUserConnection: api.IConnection = { host: connection.host };
  const anotherUser = await authorize_user_join(anotherUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(anotherUser);
  await TestValidator.error(
    "cannot update another user's comment",
    async () => {
      await api.functional.discussionBoard.user.articles.comments.update(
        anotherUserConnection,
        {
          articleId: article.id,
          commentId: comment.id,
          body: {
            content: RandomGenerator.paragraph({ sentences: 1 }),
          } satisfies IDiscussionBoardComment.IUpdate,
        },
      );
    },
  );
}
