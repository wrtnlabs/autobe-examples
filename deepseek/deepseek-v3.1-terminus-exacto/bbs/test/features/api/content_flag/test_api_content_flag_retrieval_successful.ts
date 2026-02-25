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

export async function test_api_content_flag_retrieval_successful(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create user and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(authorizedUser);
  // Step 2: Create an article as the user
  // Note: discussion_board_section_id requires a valid existing section ID
  // In a real test environment, this would be set up with proper sections
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
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Step 3: Create content flag for the article
  const contentFlag =
    await generate_random_discussion_board_user_content_flags_create(
      userConnection,
      {
        body: {
          flagged_article_id: article.id,
          flag_reason: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 5,
            wordMax: 15,
          }),
        } satisfies IDiscussionBoardContentFlag.ICreate,
      },
    );
  typia.assert(contentFlag);
  // Step 4: Retrieve the content flag
  const retrievedFlag =
    await api.functional.discussionBoard.user.content_flags.at(userConnection, {
      flagId: contentFlag.id,
    });
  typia.assert(retrievedFlag);
  // Step 5: Validate flag details
  TestValidator.equals("flag IDs match", retrievedFlag.id, contentFlag.id);
  TestValidator.equals(
    "flag reason matches",
    retrievedFlag.flag_reason,
    contentFlag.flag_reason,
  );
  TestValidator.equals("status is pending", retrievedFlag.status, "pending");
  TestValidator.equals(
    "reporter ID matches",
    retrievedFlag.reporter.id,
    authorizedUser.id,
  );
  TestValidator.notEquals(
    "reporter display name present",
    retrievedFlag.reporter.display_name,
    "",
  );
  TestValidator.predicate(
    "created at timestamp present",
    !!retrievedFlag.created_at,
  );
  TestValidator.predicate(
    "updated at timestamp present",
    !!retrievedFlag.updated_at,
  );
  // Step 6: Validate relationships
  TestValidator.predicate(
    "flagged article relationship present",
    !!retrievedFlag.flaggedArticle,
  );
  if (retrievedFlag.flaggedArticle) {
    TestValidator.equals(
      "article ID matches",
      retrievedFlag.flaggedArticle.id,
      article.id,
    );
    TestValidator.equals(
      "article title matches",
      retrievedFlag.flaggedArticle.title,
      article.title,
    );
    TestValidator.predicate(
      "article author present",
      !!retrievedFlag.flaggedArticle.author,
    );
    TestValidator.predicate(
      "article section present",
      !!retrievedFlag.flaggedArticle.section,
    );
  }
  TestValidator.equals(
    "flagged comment should be null",
    retrievedFlag.flaggedComment,
    null,
  );
  TestValidator.equals(
    "reviewing admin should be null",
    retrievedFlag.reviewingAdmin,
    null,
  );
  TestValidator.equals(
    "resolution reason should be null",
    retrievedFlag.resolution_reason,
    null,
  );
  TestValidator.equals(
    "resolved at should be null",
    retrievedFlag.resolved_at,
    null,
  );
  TestValidator.equals(
    "deleted at should be null",
    retrievedFlag.deleted_at,
    null,
  );
}
