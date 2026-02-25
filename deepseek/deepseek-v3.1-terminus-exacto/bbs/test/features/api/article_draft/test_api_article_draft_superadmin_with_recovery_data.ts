import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticleDraft } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleDraft";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { prepare_random_discussion_board_article_draft } from "../../../prepare/prepare_random_discussion_board_article_draft";
import { generate_random_discussion_board_super_admin_articles_drafts_create } from "../../../generate/generate_random_discussion_board_super_admin_articles_drafts_create";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_article_draft_superadmin_with_recovery_data(
  connection: api.IConnection
): Promise<void> {
  // Step 1: Create super administrator account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(superAdmin);

  // Step 2: Create article draft with recovery data
  const draftBody = {
    draft_title: RandomGenerator.paragraph({ sentences: 2 }),
    draft_content: RandomGenerator.content({ paragraphs: 3 }),
    draft_status: "draft",
    recovery_data: {
      lastCaretPosition: "150",
      autoSaveVersion: "3",
      unsavedChanges: "false",
      lastEditTimestamp: new Date().toISOString(),
    },
  } satisfies IDiscussionBoardArticleDraft.ICreate;

  const draft = await generate_random_discussion_board_super_admin_articles_drafts_create(
    superAdminConnection,
    { body: draftBody },
  );
  typia.assert(draft);

  // Step 3: Validate business logic (timestamps and draft status)
  TestValidator.predicate("draft status is draft", draft.draft_status === "draft");
  TestValidator.predicate("has draft_created_at", draft.draft_created_at !== null);
  TestValidator.predicate("has draft_updated_at", draft.draft_updated_at !== null);
  TestValidator.predicate("has last_saved_at", draft.last_saved_at !== null);
  TestValidator.predicate("draft_deleted_at is null for new draft", draft.draft_deleted_at === null);
}