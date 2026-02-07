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
 * Test the draft status transition workflow from draft to published to archived states.
 * 1. Create a user account and authenticate
 * 2. Create an initial draft article with draft status
 * 3. Update draft status to 'published' and validate transition
 * 4. Update draft status to 'archived' and validate transition
 * 5. Test invalid status transitions (e.g., draft → archived directly)
 * 6. Verify timestamp updates on each status change
 */
export async function test_api_article_draft_status_transition_workflow(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Create initial draft article
  const draft =
    await generate_random_discussion_board_user_article_drafts_create(
      userConnection,
      {
        body: {
          draft_title: RandomGenerator.paragraph({ sentences: 2 }),
          draft_content: RandomGenerator.content({ paragraphs: 3 }),
          recovery_data: null,
        } satisfies IDiscussionBoardArticleDraft.ICreate,
      },
    );
  typia.assert(draft);
  // Store initial timestamp for comparison
  const initialUpdatedAt = draft.draftUpdatedAt;
  // Test transition: draft → published
  const publishedDraft =
    await api.functional.discussionBoard.user.article_drafts.update(
      userConnection,
      {
        draftId: draft.id,
        body: {
          draft_status: "published",
        } satisfies IDiscussionBoardArticleDraft.IUpdate,
      },
    );
  typia.assert(publishedDraft);
  // Validate published transition
  TestValidator.equals(
    "published status",
    publishedDraft.draftStatus,
    "published",
  );
  TestValidator.notEquals(
    "updated timestamp changed",
    publishedDraft.draftUpdatedAt,
    initialUpdatedAt,
  );
  // Test transition: published → archived
  const archivedDraft =
    await api.functional.discussionBoard.user.article_drafts.update(
      userConnection,
      {
        draftId: draft.id,
        body: {
          draft_status: "archived",
        } satisfies IDiscussionBoardArticleDraft.IUpdate,
      },
    );
  typia.assert(archivedDraft);
  // Validate archived transition
  TestValidator.equals(
    "archived status",
    archivedDraft.draftStatus,
    "archived",
  );
  TestValidator.notEquals(
    "timestamp updated again",
    archivedDraft.draftUpdatedAt,
    publishedDraft.draftUpdatedAt,
  );
  // Test invalid transition: archived → draft (should fail)
  await TestValidator.error(
    "invalid transition from archived to draft",
    async () => {
      await api.functional.discussionBoard.user.article_drafts.update(
        userConnection,
        {
          draftId: draft.id,
          body: {
            draft_status: "draft",
          } satisfies IDiscussionBoardArticleDraft.IUpdate,
        },
      );
    },
  );
  // Verify final state remains archived by updating title
  const finalDraft =
    await api.functional.discussionBoard.user.article_drafts.update(
      userConnection,
      {
        draftId: draft.id,
        body: {
          draft_title: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardArticleDraft.IUpdate,
      },
    );
  typia.assert(finalDraft);
  TestValidator.equals(
    "final status remains archived",
    finalDraft.draftStatus,
    "archived",
  );
}
