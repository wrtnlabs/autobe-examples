import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentFlag";
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
import { generate_random_discussion_board_user_comments_flags_create } from "../../../generate/generate_random_discussion_board_user_comments_flags_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";
import { prepare_random_discussion_board_comment_flag } from "../../../prepare/prepare_random_discussion_board_comment_flag";

export async function test_api_comment_flag_invalid_comment_scenario(
  connection: api.IConnection,
): Promise<void> {
  // Create user account for flag attempts
  const userConnection: api.IConnection = { host: connection.host };
  const user = await api.functional.discussionBoard.auth.user.join(
    userConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardUser.IJoin,
    },
  );
  typia.assert(user);
  // Test 1: Attempt to flag non-existent comment
  await TestValidator.error(
    "flag non-existent comment returns error",
    async () => {
      await api.functional.discussionBoard.user.comments.flags.create(
        userConnection,
        {
          commentId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            flag_reason: RandomGenerator.paragraph({ sentences: 2 }),
            flag_type: "inappropriate",
          } satisfies IDiscussionBoardCommentFlag.ICreate,
        },
      );
    },
  );
  // Test 2: Create article and comment, then delete and flag
  const article = await api.functional.discussionBoard.user.articles.create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  const comment =
    await api.functional.discussionBoard.user.articles.comments.create(
      userConnection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);
  // Delete the comment to make it inaccessible
  await api.functional.discussionBoard.user.articles.comments.erase(
    userConnection,
    {
      articleId: article.id,
      commentId: comment.id,
    },
  );
  // Test 3: Attempt to flag deleted comment
  await TestValidator.error("flag deleted comment returns error", async () => {
    await api.functional.discussionBoard.user.comments.flags.create(
      userConnection,
      {
        commentId: comment.id,
        body: {
          flag_reason: RandomGenerator.paragraph({ sentences: 2 }),
          flag_type: "spam",
        } satisfies IDiscussionBoardCommentFlag.ICreate,
      },
    );
  });
}
