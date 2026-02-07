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

export async function test_api_article_draft_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user connection and authenticate
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
  // 2. Create article draft with proper property names
  const draftData = {
    draft_title: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 5,
      wordMax: 10,
    }).substring(0, 200),
    draft_content: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    recovery_data: JSON.stringify({
      cursor: { line: 1, column: 10 },
      lastEdit: new Date().toISOString(),
    }),
  } satisfies IDiscussionBoardArticleDraft.ICreate;
  const createdDraft =
    await generate_random_discussion_board_user_article_drafts_create(
      userConnection,
      { body: draftData },
    );
  typia.assert(createdDraft);
  // 3. Retrieve the draft
  const retrievedDraft =
    await api.functional.discussionBoard.user.article_drafts.at(
      userConnection,
      { draftId: createdDraft.id },
    );
  typia.assert(retrievedDraft);
  // 4. Validate draft fields with correct property names
  TestValidator.equals("draft ID matches", retrievedDraft.id, createdDraft.id);
  TestValidator.equals(
    "draft title matches",
    retrievedDraft.draftTitle,
    draftData.draft_title,
  );
  TestValidator.equals(
    "draft content matches",
    retrievedDraft.draftContent,
    draftData.draft_content,
  );
  TestValidator.equals(
    "draft status is draft",
    retrievedDraft.draftStatus,
    "draft",
  );
  TestValidator.equals(
    "recovery data matches",
    retrievedDraft.recoveryData,
    draftData.recovery_data,
  );
  // 5. Validate draft is not published
  TestValidator.equals(
    "article field is null for draft",
    retrievedDraft.article,
    null,
  );
  TestValidator.equals(
    "draftDeletedAt is null",
    retrievedDraft.draftDeletedAt,
    null,
  );
}
