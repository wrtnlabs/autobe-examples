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

export async function test_api_article_draft_update_workflow(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(admin);
  // 2. Create initial draft
  const recoveryData = { autoSaveVersion: "1", lastEditPosition: "0" };
  const initialDraft =
    await generate_random_discussion_board_admin_articles_drafts_create(
      adminConnection,
      {
        body: {
          draft_title: RandomGenerator.paragraph({ sentences: 2 }),
          draft_content: RandomGenerator.content({ paragraphs: 3 }),
          draft_status: "draft",
          recovery_data: recoveryData,
        },
      },
    );
  typia.assert(initialDraft);
  // 3. Store original timestamp
  const originalCreatedAt = initialDraft.draft_created_at;
  TestValidator.equals(
    "recovery data preserved",
    initialDraft.recovery_data,
    JSON.stringify(recoveryData),
  );
  // 4. Update draft with new title, content, and status
  const updateBody = {
    draft_title: RandomGenerator.paragraph({ sentences: 3 }),
    draft_content: RandomGenerator.content({ paragraphs: 5 }),
    draft_status: "published",
  } satisfies IDiscussionBoardArticleDraft.IUpdate;
  const updatedDraft =
    await api.functional.discussionBoard.admin.articles_drafts.update(
      adminConnection,
      {
        draftId: initialDraft.id,
        body: updateBody,
      },
    );
  typia.assert(updatedDraft);
  // 5. Verify field updates
  TestValidator.equals(
    "title updated",
    updatedDraft.draft_title,
    updateBody.draft_title,
  );
  TestValidator.equals(
    "content updated",
    updatedDraft.draft_content,
    updateBody.draft_content,
  );
  TestValidator.equals(
    "status updated",
    updatedDraft.draft_status,
    updateBody.draft_status,
  );
  TestValidator.notEquals(
    "last_saved_at updated",
    initialDraft.last_saved_at,
    updatedDraft.last_saved_at,
  );
  TestValidator.notEquals(
    "draft_updated_at updated",
    initialDraft.draft_updated_at,
    updatedDraft.draft_updated_at,
  );
  TestValidator.equals(
    "draft_created_at unchanged",
    updatedDraft.draft_created_at,
    originalCreatedAt,
  );
  TestValidator.equals(
    "recovery data still present",
    updatedDraft.recovery_data,
    initialDraft.recovery_data,
  );
  TestValidator.predicate(
    "draft_deleted_at remains null",
    updatedDraft.draft_deleted_at === null,
  );
}