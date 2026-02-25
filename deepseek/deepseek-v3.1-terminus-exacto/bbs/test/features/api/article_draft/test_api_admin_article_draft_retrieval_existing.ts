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

export async function test_api_admin_article_draft_retrieval_existing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create article draft
  const draftBody = {
    draft_title: RandomGenerator.paragraph({ sentences: 2 }),
    draft_content: RandomGenerator.content({ paragraphs: 3 }),
    draft_status: "draft",
    recovery_data: null,
  } satisfies IDiscussionBoardArticleDraft.ICreate;
  const createdDraft =
    await generate_random_discussion_board_admin_articles_drafts_create(
      adminConnection,
      { body: draftBody },
    );
  typia.assert(createdDraft);
  // 3. Retrieve the draft by ID
  const retrievedDraft =
    await api.functional.discussionBoard.admin.articles_drafts.at(
      adminConnection,
      { draftId: createdDraft.id },
    );
  typia.assert(retrievedDraft);
  // 4. Validate all fields
  TestValidator.equals("draft ID matches", retrievedDraft.id, createdDraft.id);
  TestValidator.equals(
    "draft title matches",
    retrievedDraft.draft_title,
    createdDraft.draft_title,
  );
  TestValidator.equals(
    "draft content matches",
    retrievedDraft.draft_content,
    createdDraft.draft_content,
  );
  TestValidator.equals(
    "draft status is draft",
    retrievedDraft.draft_status,
    "draft",
  );
  TestValidator.equals(
    "recovery data is null",
    retrievedDraft.recovery_data,
    null,
  );
  // 5. Validate timestamp formats
  TestValidator.predicate(
    "draft_created_at is valid ISO string",
    () => !isNaN(new Date(retrievedDraft.draft_created_at).getTime()),
  );
  TestValidator.predicate(
    "draft_updated_at is valid ISO string",
    () => !isNaN(new Date(retrievedDraft.draft_updated_at).getTime()),
  );
  TestValidator.predicate(
    "last_saved_at is valid ISO string",
    () => !isNaN(new Date(retrievedDraft.last_saved_at).getTime()),
  );
  TestValidator.equals(
    "draft_deleted_at is null for active draft",
    retrievedDraft.draft_deleted_at,
    null,
  );
}
