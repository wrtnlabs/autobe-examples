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

export async function test_api_comment_flag_creation_successful(
  connection: api.IConnection,
): Promise<void> {
  // Setup first user (author of article and comment)
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await authorize_user_join(authorConnection, {});
  typia.assert(author);
  // Create article as first user
  const article = await generate_random_discussion_board_user_articles_create(
    authorConnection,
    {},
  );
  typia.assert(article);
  // Create comment as first user
  const comment =
    await generate_random_discussion_board_user_articles_comments_create(
      authorConnection,
      {
        params: { articleId: article.id },
      },
    );
  typia.assert(comment);
  // Setup second user (flag submitter)
  const flaggerConnection: api.IConnection = { host: connection.host };
  const flagger = await authorize_user_join(flaggerConnection, {});
  typia.assert(flagger);
  // Submit flag as second user
  const flagData = {
    flag_reason: RandomGenerator.paragraph({ sentences: 1 }),
    flag_type: "inappropriate",
  } satisfies IDiscussionBoardCommentFlag.ICreate;
  const flag =
    await generate_random_discussion_board_user_comments_flags_create(
      flaggerConnection,
      {
        params: { commentId: comment.id },
        body: flagData,
      },
    );
  typia.assert(flag);
  // Validate flag properties
  TestValidator.equals(
    "flag reason matches input",
    flag.flag_reason,
    flagData.flag_reason,
  );
  TestValidator.equals(
    "flag type matches input",
    flag.flag_type,
    flagData.flag_type,
  );
  TestValidator.equals("flag status should be pending", flag.status, "pending");
  TestValidator.equals("flagging user id matches", flag.user.id, flagger.id);
  TestValidator.equals("comment id matches", flag.comment.id, comment.id);
  TestValidator.predicate(
    "flag has creation timestamp",
    flag.created_at !== undefined,
  );
  TestValidator.equals(
    "reviewer should be null initially",
    flag.reviewer,
    null,
  );
  TestValidator.equals(
    "reviewed_at should be null initially",
    flag.reviewed_at,
    null,
  );
  TestValidator.equals(
    "resolved_at should be null initially",
    flag.resolved_at,
    null,
  );
  // Test duplicate flag prevention
  await TestValidator.error("duplicate flag should be rejected", async () => {
    await generate_random_discussion_board_user_comments_flags_create(
      flaggerConnection,
      {
        params: { commentId: comment.id },
        body: flagData,
      },
    );
  });
}
