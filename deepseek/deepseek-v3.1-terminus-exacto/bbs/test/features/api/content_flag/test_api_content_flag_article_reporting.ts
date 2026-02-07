import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentFlag";
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
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { generate_random_discussion_board_user_content_flags_create } from "../../../generate/generate_random_discussion_board_user_content_flags_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_content_flag } from "../../../prepare/prepare_random_discussion_board_content_flag";

export async function test_api_content_flag_article_reporting(
  connection: api.IConnection,
): Promise<void> {
  // Create a user connection and register
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
  // Create an article to be flagged
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
  // Create a content flag for the article
  const flagReason = "Inappropriate content violation";
  const contentFlag =
    await generate_random_discussion_board_user_content_flags_create(
      userConnection,
      {
        body: {
          flag_reason: flagReason,
          flagged_article_id: article.id,
          flagged_comment_id: undefined,
        } satisfies IDiscussionBoardContentFlag.ICreate,
      },
    );
  typia.assert(contentFlag);
  // Validate the content flag response
  TestValidator.equals(
    "flag has pending status",
    contentFlag.status,
    "pending",
  );
  TestValidator.equals(
    "flag reason matches input",
    contentFlag.flag_reason,
    flagReason,
  );
  TestValidator.equals(
    "flagged article ID matches",
    contentFlag.flaggedArticle?.id,
    article.id,
  );
  TestValidator.equals(
    "reporter ID matches user ID",
    contentFlag.reporter.id,
    user.id,
  );
  TestValidator.notEquals("flag has generated ID", contentFlag.id, "");
  TestValidator.predicate(
    "flag has valid creation timestamp",
    () => !isNaN(new Date(contentFlag.created_at).getTime()),
  );
  TestValidator.predicate(
    "flag has valid update timestamp",
    () => !isNaN(new Date(contentFlag.updated_at).getTime()),
  );
  TestValidator.equals(
    "flag has no resolution reason initially",
    contentFlag.resolution_reason,
    null,
  );
  TestValidator.equals(
    "flag has no resolved at timestamp initially",
    contentFlag.resolved_at,
    null,
  );
  TestValidator.equals(
    "flag has no reviewing admin initially",
    contentFlag.reviewingAdmin,
    null,
  );
  TestValidator.equals(
    "flag has no flagged comment",
    contentFlag.flaggedComment,
    null,
  );
}
