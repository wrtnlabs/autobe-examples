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

export async function test_api_article_draft_update_content_title_save(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create fresh user account
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {});
  typia.assert(user);
  // Step 2: Create initial article draft
  const initialDraft =
    await generate_random_discussion_board_user_articles_drafts_create(
      userConnection,
      {
        body: {
          draft_title: RandomGenerator.name(3),
          draft_content: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 2,
            sentenceMax: 4,
          }),
          draft_status: "draft",
        },
      },
    );
  typia.assert(initialDraft);
  // Store initial timestamps for comparison
  const initialLastSaved = new Date(initialDraft.last_saved_at);
  const initialDraftCreated = new Date(initialDraft.draft_created_at);
  const initialDraftUpdated = new Date(initialDraft.draft_updated_at);
  // Step 3: Update draft with new title and content
  const newTitle = RandomGenerator.name(4);
  const newContent = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 3,
    sentenceMax: 6,
  });
  const updatedDraft =
    await api.functional.discussionBoard.user.articles_drafts.update(
      userConnection,
      {
        draftId: initialDraft.id,
        body: {
          draft_title: newTitle,
          draft_content: newContent,
          draft_status: "draft",
        } satisfies IDiscussionBoardArticleDraft.IUpdate,
      },
    );
  typia.assert(updatedDraft);
  // Step 4: Validate response
  TestValidator.equals(
    "title should be updated",
    updatedDraft.draft_title,
    newTitle,
  );
  TestValidator.equals(
    "content should be updated",
    updatedDraft.draft_content,
    newContent,
  );
  TestValidator.equals(
    "status remains draft",
    updatedDraft.draft_status,
    "draft",
  );
  TestValidator.equals("id remains same", updatedDraft.id, initialDraft.id);
  TestValidator.equals(
    "created at unchanged",
    updatedDraft.draft_created_at,
    initialDraft.draft_created_at,
  );
  const updatedLastSaved = new Date(updatedDraft.last_saved_at);
  const updatedDraftUpdated = new Date(updatedDraft.draft_updated_at);
  TestValidator.predicate(
    "last saved at updated",
    updatedLastSaved > initialLastSaved,
  );
  TestValidator.predicate(
    "draft updated at updated",
    updatedDraftUpdated > initialDraftUpdated,
  );
  // Step 5a: Test partial update - only title
  const titleOnlyUpdate = RandomGenerator.name(2);
  const titleOnlyResult =
    await api.functional.discussionBoard.user.articles_drafts.update(
      userConnection,
      {
        draftId: initialDraft.id,
        body: {
          draft_title: titleOnlyUpdate,
        } satisfies IDiscussionBoardArticleDraft.IUpdate,
      },
    );
  typia.assert(titleOnlyResult);
  TestValidator.equals(
    "title only update works",
    titleOnlyResult.draft_title,
    titleOnlyUpdate,
  );
  TestValidator.equals(
    "content unchanged in title update",
    titleOnlyResult.draft_content,
    updatedDraft.draft_content,
  );
  // Step 5b: Test partial update - only content
  const contentOnlyUpdate = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 3,
    sentenceMax: 5,
  });
  const contentOnlyResult =
    await api.functional.discussionBoard.user.articles_drafts.update(
      userConnection,
      {
        draftId: initialDraft.id,
        body: {
          draft_content: contentOnlyUpdate,
        } satisfies IDiscussionBoardArticleDraft.IUpdate,
      },
    );
  typia.assert(contentOnlyResult);
  TestValidator.equals(
    "content only update works",
    contentOnlyResult.draft_content,
    contentOnlyUpdate,
  );
  TestValidator.equals(
    "title unchanged in content update",
    contentOnlyResult.draft_title,
    titleOnlyResult.draft_title,
  );
  // Check recovery_data field exists (can be null or object)
  TestValidator.predicate(
    "recovery data field present",
    contentOnlyResult.recovery_data === null ||
      typeof contentOnlyResult.recovery_data === "string",
  );
}
