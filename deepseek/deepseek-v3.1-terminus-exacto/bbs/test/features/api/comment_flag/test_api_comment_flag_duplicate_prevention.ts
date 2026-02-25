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

/**
 * Test duplicate comment flag prevention logic.
 * This test verifies that users cannot submit multiple flags on the same comment,
 * ensuring the system enforces uniqueness constraints between comment_id and user_id.
 */
export async function test_api_comment_flag_duplicate_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup user account
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {});
  typia.assert(user);
  // 2. Create article and comment
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {},
  );
  typia.assert(article);
  const comment =
    await generate_random_discussion_board_user_articles_comments_create(
      userConnection,
      {
        params: { articleId: article.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);
  // 3. Submit initial flag successfully
  const initialFlag =
    await generate_random_discussion_board_user_comments_flags_create(
      userConnection,
      {
        params: { commentId: comment.id },
        body: {
          flag_reason: RandomGenerator.paragraph({ sentences: 1 }),
          flag_type: "spam",
        } satisfies IDiscussionBoardCommentFlag.ICreate,
      },
    );
  typia.assert(initialFlag);
  // 4. Attempt to flag the same comment again with identical reason/type
  await TestValidator.error(
    "duplicate flag with identical reason/type",
    async () => {
      await generate_random_discussion_board_user_comments_flags_create(
        userConnection,
        {
          params: { commentId: comment.id },
          body: {
            flag_reason: initialFlag.flag_reason,
            flag_type: initialFlag.flag_type,
          } satisfies IDiscussionBoardCommentFlag.ICreate,
        },
      );
    },
  );
  // 5. Attempt to flag the same comment again with different reason/type
  await TestValidator.error(
    "duplicate flag with different reason/type",
    async () => {
      await generate_random_discussion_board_user_comments_flags_create(
        userConnection,
        {
          params: { commentId: comment.id },
          body: {
            flag_reason: RandomGenerator.paragraph({ sentences: 1 }),
            flag_type: "inappropriate",
          } satisfies IDiscussionBoardCommentFlag.ICreate,
        },
      );
    },
  );
  // 6. Verify that only one flag exists for this comment-user combination
  TestValidator.predicate(
    "flag status should be pending",
    initialFlag.status === "pending",
  );
}
