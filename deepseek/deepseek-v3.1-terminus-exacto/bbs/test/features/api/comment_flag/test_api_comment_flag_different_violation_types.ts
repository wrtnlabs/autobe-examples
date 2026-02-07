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
import { generate_random_discussion_board_user_articles_comments_flags_create } from "../../../generate/generate_random_discussion_board_user_articles_comments_flags_create";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";
import { prepare_random_discussion_board_comment_flag } from "../../../prepare/prepare_random_discussion_board_comment_flag";

/**
 * Test flag creation with different violation types to ensure the system properly categorizes reported comments.
 * This scenario validates that users can flag comments for various reasons such as spam, harassment,
 * inappropriate content, or misinformation. Each flag creation specifies a different flag_type while
 * maintaining consistent validation of article and comment existence.
 */
export async function test_api_comment_flag_different_violation_types(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection for flag submission
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(authorizedUser);
  // Create an article for the comment
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 5,
          wordMax: 8,
        }),
        content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 3,
          sentenceMax: 5,
        }),
        section_id: typia.random<string & tags.Format<"uuid">>(),
        status: "published" as const,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Create a comment on the article
  const comment =
    await generate_random_discussion_board_user_articles_comments_create(
      userConnection,
      {
        params: { articleId: article.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);
  // Define different violation types to test
  const violationTypes = [
    "spam",
    "harassment",
    "inappropriate",
    "misinformation",
  ] as const;
  // Create flags for each violation type
  for (const flagType of violationTypes) {
    const flag =
      await generate_random_discussion_board_user_articles_comments_flags_create(
        userConnection,
        {
          params: {
            articleId: article.id,
            commentId: comment.id,
          },
          body: {
            flag_reason: `This comment violates ${flagType} policy`,
            flag_type: flagType,
          } satisfies IDiscussionBoardCommentFlag.ICreate,
        },
      );
    typia.assert(flag);
    // Validate flag properties
    TestValidator.equals(
      `flag type ${flagType} should match input`,
      flag.flag_type,
      flagType,
    );
    TestValidator.predicate(
      `flag reason ${flagType} should contain violation type`,
      flag.flag_reason.includes(flagType),
    );
    TestValidator.equals(
      `flag status ${flagType} should be pending`,
      flag.status,
      "pending",
    );
    TestValidator.equals(
      `flag comment ID ${flagType} should match`,
      flag.comment.id,
      comment.id,
    );
    TestValidator.equals(
      `flag user ID ${flagType} should match`,
      flag.user.id,
      authorizedUser.id,
    );
  }
  // Additional validation: ensure all flags were created successfully
  TestValidator.predicate(
    "should create flags for all violation types",
    violationTypes.length === 4,
  );
}
