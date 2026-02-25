import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticleDraft } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleDraft";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_articles_drafts_create } from "../../../generate/generate_random_discussion_board_admin_articles_drafts_create";
import { prepare_random_discussion_board_article_draft } from "../../../prepare/prepare_random_discussion_board_article_draft";

export async function test_api_admin_articles_drafts_creation_with_recovery_data(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // Step 2: Create article draft with recovery data
  const recoveryData = {
    edit_history: JSON.stringify([
      {
        timestamp: new Date().toISOString(),
        action: "create",
        content_length: "0",
      },
      {
        timestamp: new Date(Date.now() + 1000).toISOString(),
        action: "edit",
        content_length: "150",
        cursor_position: JSON.stringify({ line: 5, column: 12 }),
      },
    ]),
    unsaved_changes: "true",
    auto_save_interval: "30000",
    last_cursor_position: JSON.stringify({ line: 8, column: 3 }),
    document_state: "editing",
  } satisfies {
    [key: string]: string;
  };
  const draftInput = {
    draft_title: RandomGenerator.paragraph({ sentences: 1 }),
    draft_content: RandomGenerator.content({ paragraphs: 2 }),
    draft_status: "draft",
    recovery_data: recoveryData,
  } satisfies IDiscussionBoardArticleDraft.ICreate;
  const draft =
    await api.functional.discussionBoard.admin.articles_drafts.create(
      adminConnection,
      { body: draftInput },
    );
  typia.assert(draft);
  // Step 3: Validate recovery data preservation
  TestValidator.equals(
    "draft title matches input",
    draft.draft_title,
    draftInput.draft_title,
  );
  TestValidator.equals(
    "draft content matches input",
    draft.draft_content,
    draftInput.draft_content,
  );
  TestValidator.equals("draft status is draft", draft.draft_status, "draft");
  // Validate recovery data - it should be stored as string in response
  TestValidator.predicate("recovery data exists", draft.recovery_data !== null);
  if (draft.recovery_data !== null) {
    // Parse the recovery_data string back to object for validation
    const parsedRecoveryData = JSON.parse(draft.recovery_data);
    TestValidator.predicate(
      "recovery data contains edit_history key",
      typeof parsedRecoveryData.edit_history === "string",
    );
    TestValidator.predicate(
      "recovery data contains unsaved_changes key",
      typeof parsedRecoveryData.unsaved_changes === "string",
    );
    TestValidator.predicate(
      "recovery data contains document_state key",
      typeof parsedRecoveryData.document_state === "string",
    );
    // Parse and validate the edit history array
    if (parsedRecoveryData.edit_history) {
      const parsedEditHistory = JSON.parse(parsedRecoveryData.edit_history);
      TestValidator.predicate(
        "recovery data contains edit history array",
        Array.isArray(parsedEditHistory),
      );
      TestValidator.equals(
        "edit history has 2 entries",
        parsedEditHistory.length,
        2,
      );
      TestValidator.predicate(
        "first edit history entry has timestamp",
        typeof parsedEditHistory[0].timestamp === "string",
      );
    }
  }
}
