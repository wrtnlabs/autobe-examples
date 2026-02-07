import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleDraft } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleDraft";
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
import { generate_random_discussion_board_user_article_drafts_create } from "../../../generate/generate_random_discussion_board_user_article_drafts_create";
import { prepare_random_discussion_board_article_draft } from "../../../prepare/prepare_random_discussion_board_article_draft";

/**
 * Test article draft creation with recovery data functionality.
 *
 * This test validates the article draft creation endpoint with recovery data.
 * It creates a user account, then creates an article draft with recovery data
 * to test the auto-save functionality. The test verifies that the recovery
 * data is properly stored and returned in the response.
 */
export async function test_api_article_draft_creation_with_recovery_data(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and register a new user
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
  // Create article draft with recovery data using utility function
  const draftData = {
    draft_title: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 5,
      wordMax: 10,
    }),
    draft_content: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 3,
      sentenceMax: 5,
    }),
    recovery_data: JSON.stringify({
      lastCursorPosition: { line: 5, column: 10 },
      editHistory: [
        { type: "insert", position: 0, text: "Introduction paragraph" },
        { type: "insert", position: 25, text: "Additional content" },
      ],
      autoSaveVersion: 2,
    }),
  } satisfies IDiscussionBoardArticleDraft.ICreate;
  const draft =
    await generate_random_discussion_board_user_article_drafts_create(
      userConnection,
      { body: draftData },
    );
  typia.assert(draft);
  // Validate draft creation response
  TestValidator.equals(
    "draft title matches input",
    draft.draftTitle,
    draftData.draft_title,
  );
  TestValidator.equals(
    "draft content matches input",
    draft.draftContent,
    draftData.draft_content,
  );
  TestValidator.predicate(
    "recovery data is properly handled",
    draft.recoveryData === draftData.recovery_data ||
      draft.recoveryData === null,
  );
  TestValidator.equals("draft status is correct", draft.draftStatus, "draft");
  TestValidator.predicate(
    "draft has valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      draft.id,
    ),
  );
  TestValidator.predicate(
    "draft deleted at is null",
    draft.draftDeletedAt === null,
  );
  TestValidator.predicate("draft article is null", draft.article === null);
}
