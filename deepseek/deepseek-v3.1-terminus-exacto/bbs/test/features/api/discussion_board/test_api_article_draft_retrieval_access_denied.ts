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
 * Test access control when attempting to retrieve a draft that has been soft-deleted or belongs to another user.
 * Create a draft as one user, then authenticate as a different user and attempt to retrieve the draft by ID.
 * Validate that the system properly denies access to drafts that don't belong to the authenticated user.
 */
export async function test_api_article_draft_retrieval_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate first user
  const firstUserConnection: api.IConnection = { host: connection.host };
  const firstUser = await authorize_user_join(firstUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(firstUser);
  // 2. Create draft with first user (ensure minimum length requirements)
  const draftTitle = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 5,
    wordMax: 8,
  });
  const draftContent = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 3,
    sentenceMax: 5,
  });
  // Ensure minimum length requirements are met
  TestValidator.predicate(
    "draft title meets minimum length",
    draftTitle.length >= 5,
  );
  TestValidator.predicate(
    "draft content meets minimum length",
    draftContent.length >= 50,
  );
  const draft =
    await generate_random_discussion_board_user_article_drafts_create(
      firstUserConnection,
      {
        body: {
          draft_title: draftTitle,
          draft_content: draftContent,
          recovery_data: null,
        } satisfies IDiscussionBoardArticleDraft.ICreate,
      },
    );
  typia.assert(draft);
  // 3. Create and authenticate second user
  const secondUserConnection: api.IConnection = { host: connection.host };
  const secondUser = await authorize_user_join(secondUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(secondUser);
  // 4. Attempt to retrieve draft with second user (should fail)
  await TestValidator.error(
    "access denied when retrieving another user's draft",
    async () => {
      await api.functional.discussionBoard.user.article_drafts.at(
        secondUserConnection,
        {
          draftId: draft.id,
        },
      );
    },
  );
  // 5. Verify first user can still access their own draft
  const retrievedDraft =
    await api.functional.discussionBoard.user.article_drafts.at(
      firstUserConnection,
      {
        draftId: draft.id,
      },
    );
  typia.assert(retrievedDraft);
  TestValidator.equals("draft ID matches", retrievedDraft.id, draft.id);
}
