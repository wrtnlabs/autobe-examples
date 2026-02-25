import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentEditHistory";
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

export async function test_api_comment_edit_history_permission_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create User A account
  const userAConnection: api.IConnection = { host: connection.host };
  const userAAuthorized = await authorize_user_join(userAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(userAAuthorized);
  // 2. Create User B account
  const userBConnection: api.IConnection = { host: connection.host };
  const userBAuthorized = await authorize_user_join(userBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(userBAuthorized);
  // 3. User A creates an article
  const article = await generate_random_discussion_board_user_articles_create(
    userAConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.paragraph({ sentences: 5 }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 4. User A creates a comment on the article
  const comment =
    await generate_random_discussion_board_user_articles_comments_create(
      userAConnection,
      {
        params: { articleId: article.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);
  // 5. User A edits the comment to generate edit history
  const updatedComment =
    await api.functional.discussionBoard.user.articles.comments.update(
      userAConnection,
      {
        articleId: article.id,
        commentId: comment.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardComment.IUpdate,
      },
    );
  typia.assert(updatedComment);
  // 6. User B attempts to access User A's edit history
  await TestValidator.error(
    "User B should not access User A's edit history",
    async () => {
      await api.functional.discussionBoard.user.comments.edit_histories.at(
        userBConnection,
        {
          commentId: comment.id,
          editHistoryId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  // 7. Test mismatched commentId and editHistoryId
  await TestValidator.error(
    "Should reject mismatched comment and edit history IDs",
    async () => {
      await api.functional.discussionBoard.user.comments.edit_histories.at(
        userAConnection,
        {
          commentId: typia.random<string & tags.Format<"uuid">>(),
          editHistoryId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
