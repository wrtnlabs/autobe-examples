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

export async function test_api_article_drafts_retrieve_own_draft(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated user connection
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test_password_123",
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user);
  // Create article draft
  const draftInput = {
    draft_title: RandomGenerator.paragraph({ sentences: 1 }),
    draft_content: RandomGenerator.content({ paragraphs: 1 }),
    draft_status: "draft",
    recovery_data: { autosave_timestamp: new Date().toISOString() },
  } satisfies IDiscussionBoardArticleDraft.ICreate;
  const createdDraft =
    await generate_random_discussion_board_user_articles_drafts_create(
      userConnection,
      { body: draftInput },
    );
  typia.assert(createdDraft);
  // Retrieve the draft using its ID
  const retrievedDraft =
    await api.functional.discussionBoard.user.articles_drafts.at(
      userConnection,
      { draftId: createdDraft.id },
    );
  typia.assert(retrievedDraft);
  // Validate draft properties match the creation input
  TestValidator.equals(
    "draft title matches",
    retrievedDraft.draft_title,
    draftInput.draft_title,
  );
  TestValidator.equals(
    "draft content matches",
    retrievedDraft.draft_content,
    draftInput.draft_content,
  );
  TestValidator.equals(
    "draft status matches",
    retrievedDraft.draft_status,
    draftInput.draft_status,
  );
  TestValidator.predicate(
    "has draft_created_at",
    retrievedDraft.draft_created_at !== undefined,
  );
  TestValidator.predicate(
    "has draft_updated_at",
    retrievedDraft.draft_updated_at !== undefined,
  );
  TestValidator.predicate(
    "has last_saved_at timestamp",
    retrievedDraft.last_saved_at !== undefined,
  );
  TestValidator.notEquals(
    "draft_deleted_at is null",
    retrievedDraft.draft_deleted_at,
    null,
  );
  TestValidator.equals("draft ID matches", retrievedDraft.id, createdDraft.id);
}
