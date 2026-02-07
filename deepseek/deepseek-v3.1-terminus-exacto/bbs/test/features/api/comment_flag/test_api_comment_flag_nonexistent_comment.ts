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
import { generate_random_discussion_board_user_articles_comments_flags_create } from "../../../generate/generate_random_discussion_board_user_articles_comments_flags_create";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment_flag } from "../../../prepare/prepare_random_discussion_board_comment_flag";

export async function test_api_comment_flag_nonexistent_comment(
  connection: api.IConnection,
): Promise<void> {
  // Create and authenticate a regular user
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
  // Create an article for the user (section_id needs to be valid)
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 1 }),
        section_id: typia.random<string & tags.Format<"uuid">>(), // This will need to be a valid section ID
        status: "published" as const,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Test 1: Attempt to flag a non-existent comment ID
  await TestValidator.error("flag non-existent comment", async () => {
    await generate_random_discussion_board_user_articles_comments_flags_create(
      userConnection,
      {
        params: {
          articleId: article.id,
          commentId: typia.random<string & tags.Format<"uuid">>(), // Random non-existent comment ID
        },
        body: {
          flag_reason: RandomGenerator.paragraph({ sentences: 1 }),
          flag_type: "inappropriate", // This needs to be a valid flag type
        } satisfies IDiscussionBoardCommentFlag.ICreate,
      },
    );
  });
  // Test 2: Attempt to flag a comment ID that belongs to a different article
  await TestValidator.error("flag comment from different article", async () => {
    await generate_random_discussion_board_user_articles_comments_flags_create(
      userConnection,
      {
        params: {
          articleId: typia.random<string & tags.Format<"uuid">>(), // Different article ID
          commentId: typia.random<string & tags.Format<"uuid">>(), // Random comment ID
        },
        body: {
          flag_reason: RandomGenerator.paragraph({ sentences: 1 }),
          flag_type: "spam", // This needs to be a valid flag type
        } satisfies IDiscussionBoardCommentFlag.ICreate,
      },
    );
  });
}
