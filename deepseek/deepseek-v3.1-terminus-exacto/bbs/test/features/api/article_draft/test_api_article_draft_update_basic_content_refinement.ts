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
 * Test the basic workflow of updating an article draft with content refinement.
 * A user creates a draft article with initial content, then updates it with
 * improved title and expanded content. Validate that the draft is successfully
 * updated with the new content, the draft_updated_at timestamp is automatically
 * updated, and the draft status remains 'draft'. Verify that the user can only
 * update their own drafts by attempting to access another user's draft (which
 * should fail). Check that recovery data can be updated for auto-save functionality.
 */
export async function test_api_article_draft_update_basic_content_refinement(
  connection: api.IConnection,
): Promise<void> {
  // Create first user connection and authenticate using SDK directly
  const firstUserConnection: api.IConnection = { host: connection.host };
  const firstUser = await api.functional.discussionBoard.auth.user.join(
    firstUserConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IDiscussionBoardUser.IJoin,
    },
  );
  typia.assert(firstUser);
  // Create initial draft using SDK directly
  const initialDraft =
    await api.functional.discussionBoard.user.article_drafts.create(
      firstUserConnection,
      {
        body: {
          draft_title: RandomGenerator.paragraph({ sentences: 1 }),
          draft_content: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 3,
            sentenceMax: 5,
          }),
          recovery_data: null,
        } satisfies IDiscussionBoardArticleDraft.ICreate,
      },
    );
  typia.assert(initialDraft);
  // Wait a moment to ensure timestamp difference
  await new Promise((resolve) => setTimeout(resolve, 10));
  // Update draft with refined content
  const updatedDraft =
    await api.functional.discussionBoard.user.article_drafts.update(
      firstUserConnection,
      {
        draftId: initialDraft.id,
        body: {
          draft_title: RandomGenerator.paragraph({ sentences: 2 }),
          draft_content: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 5,
            sentenceMax: 8,
          }),
          recovery_data: JSON.stringify({
            lastEditPosition: { line: 5, column: 10 },
          }),
        } satisfies IDiscussionBoardArticleDraft.IUpdate,
      },
    );
  typia.assert(updatedDraft);
  // Validate draft was updated correctly
  TestValidator.equals(
    "draft ID remains the same",
    updatedDraft.id,
    initialDraft.id,
  );
  TestValidator.notEquals(
    "draft title was updated",
    updatedDraft.draftTitle,
    initialDraft.draftTitle,
  );
  TestValidator.notEquals(
    "draft content was updated",
    updatedDraft.draftContent,
    initialDraft.draftContent,
  );
  TestValidator.equals(
    "draft status remains 'draft'",
    updatedDraft.draftStatus,
    "draft",
  );
  TestValidator.predicate(
    "recovery data was updated",
    updatedDraft.recoveryData !== null,
  );
  TestValidator.notEquals(
    "draft_updated_at timestamp was updated",
    updatedDraft.draftUpdatedAt,
    initialDraft.draftUpdatedAt,
  );
  // Create second user and attempt to access first user's draft (should fail)
  const secondUserConnection: api.IConnection = { host: connection.host };
  const secondUser = await api.functional.discussionBoard.auth.user.join(
    secondUserConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IDiscussionBoardUser.IJoin,
    },
  );
  typia.assert(secondUser);
  // Attempt to update another user's draft (should fail)
  await TestValidator.error("cannot update another user's draft", async () => {
    await api.functional.discussionBoard.user.article_drafts.update(
      secondUserConnection,
      {
        draftId: initialDraft.id,
        body: {
          draft_title: "Unauthorized update attempt",
          draft_content: "This should fail",
        } satisfies IDiscussionBoardArticleDraft.IUpdate,
      },
    );
  });
  // Test partial update with only recovery data
  const partialUpdateDraft =
    await api.functional.discussionBoard.user.article_drafts.update(
      firstUserConnection,
      {
        draftId: initialDraft.id,
        body: {
          recovery_data: JSON.stringify({
            autoSaveVersion: 2,
            lastSavedContent: updatedDraft.draftContent,
          }),
        } satisfies IDiscussionBoardArticleDraft.IUpdate,
      },
    );
  typia.assert(partialUpdateDraft);
  // Validate partial update
  TestValidator.equals(
    "title remains unchanged after partial update",
    partialUpdateDraft.draftTitle,
    updatedDraft.draftTitle,
  );
  TestValidator.equals(
    "content remains unchanged after partial update",
    partialUpdateDraft.draftContent,
    updatedDraft.draftContent,
  );
  TestValidator.notEquals(
    "recovery data was updated",
    partialUpdateDraft.recoveryData,
    updatedDraft.recoveryData,
  );
  TestValidator.notEquals(
    "draft_updated_at updated for partial update",
    partialUpdateDraft.draftUpdatedAt,
    updatedDraft.draftUpdatedAt,
  );
}
