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
 * Test the auto-recovery data management functionality for article drafts.
 * Create a draft article, then update it with recovery data containing incremental
 * changes and edit history. Verify that the recovery data is properly stored and
 * can be retrieved. Test updating the draft multiple times with different recovery
 * data payloads to simulate interrupted editing sessions. Validate that the recovery
 * data field correctly handles JSON data for auto-save functionality and that the
 * lastSavedAt timestamp is updated appropriately.
 */
export async function test_api_article_draft_recovery_data_management(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user account and authenticate
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
  // 2. Create initial draft article
  const initialDraft =
    await generate_random_discussion_board_user_article_drafts_create(
      userConnection,
      {
        body: {
          draft_title: RandomGenerator.paragraph({ sentences: 2 }),
          draft_content: RandomGenerator.content({ paragraphs: 3 }),
        } satisfies IDiscussionBoardArticleDraft.ICreate,
      },
    );
  typia.assert(initialDraft);
  // 3. Update draft with recovery data containing incremental changes
  const recoveryData1 = JSON.stringify({
    incrementalChanges: [
      { type: "insert", position: 50, text: " [additional content]" },
      { type: "delete", position: 100, length: 10 },
    ],
    cursorPosition: 75,
    lastEditTime: new Date().toISOString(),
  });
  const updatedDraft1 =
    await api.functional.discussionBoard.user.article_drafts.update(
      userConnection,
      {
        draftId: initialDraft.id,
        body: {
          recovery_data: recoveryData1,
        } satisfies IDiscussionBoardArticleDraft.IUpdate,
      },
    );
  typia.assert(updatedDraft1);
  // Validate recovery data storage
  TestValidator.equals(
    "recovery data should be stored",
    updatedDraft1.recoveryData,
    recoveryData1,
  );
  TestValidator.notEquals(
    "lastSavedAt should be updated",
    updatedDraft1.lastSavedAt,
    initialDraft.lastSavedAt,
  );
  // 4. Update draft multiple times with different recovery data
  const recoveryData2 = JSON.stringify({
    incrementalChanges: [
      { type: "insert", position: 120, text: " [more content]" },
      { type: "format", position: 80, length: 20, format: "bold" },
    ],
    cursorPosition: 140,
    lastEditTime: new Date().toISOString(),
  });
  const updatedDraft2 =
    await api.functional.discussionBoard.user.article_drafts.update(
      userConnection,
      {
        draftId: initialDraft.id,
        body: {
          recovery_data: recoveryData2,
        } satisfies IDiscussionBoardArticleDraft.IUpdate,
      },
    );
  typia.assert(updatedDraft2);
  TestValidator.equals(
    "recovery data should be updated",
    updatedDraft2.recoveryData,
    recoveryData2,
  );
  // 5. Update draft with null recovery data (simulating completion)
  const updatedDraft3 =
    await api.functional.discussionBoard.user.article_drafts.update(
      userConnection,
      {
        draftId: initialDraft.id,
        body: {
          recovery_data: null,
          draft_title: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardArticleDraft.IUpdate,
      },
    );
  typia.assert(updatedDraft3);
  TestValidator.equals(
    "recovery data should be cleared",
    updatedDraft3.recoveryData,
    null,
  );
  // 6. Test complex JSON recovery data structure
  const complexRecoveryData = JSON.stringify({
    version: "1.0",
    changes: [
      {
        id: typia.random<string & tags.Format<"uuid">>(),
        timestamp: new Date().toISOString(),
        operation: "insert",
        content: "Complex recovery data structure",
        metadata: {
          author: authorizedUser.display_name,
          sessionId: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    ],
    session: {
      startTime: new Date().toISOString(),
      totalEdits: 15,
      autoSaveInterval: 30000,
    },
  });
  const finalDraft =
    await api.functional.discussionBoard.user.article_drafts.update(
      userConnection,
      {
        draftId: initialDraft.id,
        body: {
          recovery_data: complexRecoveryData,
          draft_content: RandomGenerator.content({ paragraphs: 4 }),
        } satisfies IDiscussionBoardArticleDraft.IUpdate,
      },
    );
  typia.assert(finalDraft);
  // Validate complex recovery data handling
  TestValidator.equals(
    "complex recovery data should be properly stored",
    finalDraft.recoveryData,
    complexRecoveryData,
  );
}
