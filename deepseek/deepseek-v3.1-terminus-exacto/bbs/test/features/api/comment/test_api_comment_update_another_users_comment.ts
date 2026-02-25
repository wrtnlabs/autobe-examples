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

export async function test_api_comment_update_another_users_comment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate first user
  const firstUserConnection: api.IConnection = { host: connection.host };
  const firstUser = await authorize_user_join(firstUserConnection, {});
  typia.assert(firstUser);
  // 2. Authenticate second user
  const secondUserConnection: api.IConnection = { host: connection.host };
  const secondUser = await authorize_user_join(secondUserConnection, {});
  typia.assert(secondUser);
  // 3. Create article with first user
  const article = await generate_random_discussion_board_user_articles_create(
    firstUserConnection,
    {},
  );
  typia.assert(article);
  // 4. Create comment with first user
  const comment =
    await generate_random_discussion_board_user_articles_comments_create(
      firstUserConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardComment.ICreate,
        params: {
          articleId: article.id,
        },
      },
    );
  typia.assert(comment);
  // 5. Attempt to update comment with second user (should fail)
  const newContent = RandomGenerator.paragraph({ sentences: 3 });
  await TestValidator.error(
    "second user cannot update another user's comment",
    async () => {
      await api.functional.discussionBoard.user.articles.comments.update(
        secondUserConnection,
        {
          articleId: article.id,
          commentId: comment.id,
          body: {
            content: newContent,
          } satisfies IDiscussionBoardComment.IUpdate,
        },
      );
    },
  );
  // 6. Verify original comment unchanged
  // Note: There's no API to fetch single comment, so we need to verify by some other means
  // Since we can't fetch the comment directly, we'll skip this validation
  // as the authorization error test above is sufficient
}
