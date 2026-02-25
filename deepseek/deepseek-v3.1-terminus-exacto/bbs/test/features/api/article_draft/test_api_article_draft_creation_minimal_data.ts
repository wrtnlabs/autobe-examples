import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticleDraft } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleDraft";
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
import { generate_random_discussion_board_user_articles_drafts_create } from "../../../generate/generate_random_discussion_board_user_articles_drafts_create";
import { prepare_random_discussion_board_article_draft } from "../../../prepare/prepare_random_discussion_board_article_draft";

export async function test_api_article_draft_creation_minimal_data(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user account
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user);
  // 2. Create authenticated connection using the authorized connection
  const authConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(authConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // 3. Create article draft with minimal required fields
  const draftBody = {
    draft_title: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 5,
      wordMax: 10,
    }),
    draft_content: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    draft_status: "draft",
    // recovery_data is intentionally omitted to test default null behavior
  } satisfies IDiscussionBoardArticleDraft.ICreate;
  // 4. Create draft using SDK function (no utility function available)
  const draft =
    await api.functional.discussionBoard.user.articles_drafts.create(
      authConnection,
      { body: draftBody },
    );
  typia.assert(draft);
  // 5. Validate response matches input (business logic validation)
  TestValidator.equals(
    "title matches input",
    draft.draft_title,
    draftBody.draft_title,
  );
  TestValidator.equals(
    "content matches input",
    draft.draft_content,
    draftBody.draft_content,
  );
  TestValidator.equals(
    "status matches input",
    draft.draft_status,
    draftBody.draft_status,
  );
  TestValidator.equals(
    "recovery_data defaults to null",
    draft.recovery_data,
    null,
  );
  // 6. Validate business rules for title length
  TestValidator.predicate(
    "title meets minimum length requirement",
    draft.draft_title.length >= 5,
  );
  TestValidator.predicate(
    "title meets maximum length requirement",
    draft.draft_title.length <= 200,
  );
}
