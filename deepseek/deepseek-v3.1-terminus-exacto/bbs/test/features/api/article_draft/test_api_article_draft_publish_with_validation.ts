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

export async function test_api_article_draft_publish_with_validation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user);
  // Step 2: Create a minimal article draft
  const draftBody = {
    draft_title: RandomGenerator.paragraph({ sentences: 2 }),
    draft_content: RandomGenerator.content({ paragraphs: 1 }),
    draft_status: "draft",
  } satisfies IDiscussionBoardArticleDraft.ICreate;
  const draft =
    await generate_random_discussion_board_user_articles_drafts_create(
      userConnection,
      { body: draftBody },
    );
  typia.assert(draft);
  // Validate initial draft state
  TestValidator.equals(
    "draft status should be 'draft'",
    draft.draft_status,
    "draft",
  );
  TestValidator.equals(
    "draft title should match",
    draft.draft_title,
    draftBody.draft_title,
  );
  TestValidator.equals(
    "draft content should match",
    draft.draft_content,
    draftBody.draft_content,
  );
  // Step 3: Publish the draft by updating status to 'published'
  const publishBody = {
    draft_status: "published",
  } satisfies IDiscussionBoardArticleDraft.IUpdate;
  const publishedDraft =
    await api.functional.discussionBoard.user.articles_drafts.update(
      userConnection,
      {
        draftId: draft.id,
        body: publishBody,
      },
    );
  typia.assert(publishedDraft);
  // Validate publication
  TestValidator.equals(
    "status should be 'published' after update",
    publishedDraft.draft_status,
    "published",
  );
  TestValidator.equals(
    "title should remain unchanged",
    publishedDraft.draft_title,
    draft.draft_title,
  );
  TestValidator.equals(
    "content should remain unchanged",
    publishedDraft.draft_content,
    draft.draft_content,
  );
  TestValidator.notEquals(
    "last_saved_at should be updated",
    publishedDraft.last_saved_at,
    draft.last_saved_at,
  );
  TestValidator.predicate("last_saved_at should be recent", () => {
    const lastSaved = new Date(publishedDraft.last_saved_at);
    const now = new Date();
    return now.getTime() - lastSaved.getTime() < 60000; // within 1 minute
  });
  // Step 4: Test edge case - attempt to publish an archived draft
  // First, archive the draft
  const archiveBody = {
    draft_status: "archived",
  } satisfies IDiscussionBoardArticleDraft.IUpdate;
  const archivedDraft =
    await api.functional.discussionBoard.user.articles_drafts.update(
      userConnection,
      {
        draftId: draft.id,
        body: archiveBody,
      },
    );
  typia.assert(archivedDraft);
  // Try to publish an archived draft - this should fail
  await TestValidator.error("should not publish archived draft", async () => {
    await api.functional.discussionBoard.user.articles_drafts.update(
      userConnection,
      {
        draftId: draft.id,
        body: {
          draft_status: "published",
        } satisfies IDiscussionBoardArticleDraft.IUpdate,
      },
    );
  });
  // Step 5: Test restriction - attempt to revert published draft back to draft
  // Create a new draft for this test
  const newDraftBody = {
    draft_title: RandomGenerator.paragraph({ sentences: 2 }),
    draft_content: RandomGenerator.content({ paragraphs: 1 }),
    draft_status: "draft",
  } satisfies IDiscussionBoardArticleDraft.ICreate;
  const newDraft =
    await generate_random_discussion_board_user_articles_drafts_create(
      userConnection,
      { body: newDraftBody },
    );
  typia.assert(newDraft);
  // Publish it
  const newlyPublished =
    await api.functional.discussionBoard.user.articles_drafts.update(
      userConnection,
      {
        draftId: newDraft.id,
        body: {
          draft_status: "published",
        } satisfies IDiscussionBoardArticleDraft.IUpdate,
      },
    );
  typia.assert(newlyPublished);
  // Try to revert to draft - this may fail due to business restrictions
  await TestValidator.error("may not revert published to draft", async () => {
    await api.functional.discussionBoard.user.articles_drafts.update(
      userConnection,
      {
        draftId: newDraft.id,
        body: {
          draft_status: "draft",
        } satisfies IDiscussionBoardArticleDraft.IUpdate,
      },
    );
  });
}
