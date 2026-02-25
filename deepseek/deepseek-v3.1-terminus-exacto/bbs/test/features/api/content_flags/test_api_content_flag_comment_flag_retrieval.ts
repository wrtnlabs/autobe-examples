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
import { generate_random_discussion_board_user_articles_comments_create } from "../../../generate/generate_random_discussion_board_user_articles_comments_create";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { generate_random_discussion_board_user_content_flags_create } from "../../../generate/generate_random_discussion_board_user_content_flags_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";
import { prepare_random_discussion_board_content_flag } from "../../../prepare/prepare_random_discussion_board_content_flag";

export async function test_api_content_flag_comment_flag_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user via join (using utility function)
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {});
  typia.assert(authorizedUser);
  // 2. Create an article (requires a valid section; we use generation function which creates random data)
  // The generate_random_discussion_board_user_articles_create expects a connection with user authentication.
  // The userConnection now has the Authorization header set by authorize_user_join.
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {},
  );
  typia.assert(article);
  // 3. Create a comment on the article
  const comment =
    await generate_random_discussion_board_user_articles_comments_create(
      userConnection,
      {
        params: { articleId: article.id },
      },
    );
  typia.assert(comment);
  // 4. Submit a content flag for the comment
  const flagReason = typia.random<string & tags.MinLength<1>>();
  const createdFlag =
    await generate_random_discussion_board_user_content_flags_create(
      userConnection,
      {
        body: {
          flagged_comment_id: comment.id,
          flag_reason: flagReason,
        },
      },
    );
  typia.assert(createdFlag);
  // 5. Retrieve the flag using its ID
  const retrievedFlag =
    await api.functional.discussionBoard.user.content_flags.at(userConnection, {
      flagId: createdFlag.id,
    });
  typia.assert(retrievedFlag);
  // 6. Validate flag details
  TestValidator.equals("flag ID matches", retrievedFlag.id, createdFlag.id);
  TestValidator.equals(
    "flag reason matches",
    retrievedFlag.flag_reason,
    flagReason,
  );
  TestValidator.predicate(
    "status is a non-empty string",
    typeof retrievedFlag.status === "string" && retrievedFlag.status.length > 0,
  );
  TestValidator.equals(
    "reporter user ID",
    retrievedFlag.reporter.id,
    authorizedUser.id,
  );
  TestValidator.predicate(
    "flagged comment relationship exists",
    retrievedFlag.flaggedComment !== null &&
      retrievedFlag.flaggedComment !== undefined,
  );
  TestValidator.equals(
    "flagged comment ID matches",
    retrievedFlag.flaggedComment!.id,
    comment.id,
  );
  TestValidator.predicate(
    "flagged article should be null",
    retrievedFlag.flaggedArticle === null,
  );
  TestValidator.predicate(
    "reviewing admin should be null",
    retrievedFlag.reviewingAdmin === null,
  );
  TestValidator.predicate(
    "resolution reason should be undefined",
    retrievedFlag.resolution_reason === undefined,
  );
  TestValidator.equals(
    "created at timestamp matches",
    retrievedFlag.created_at,
    createdFlag.created_at,
  );
}
