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

export async function test_api_admin_articles_drafts_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await api.functional.discussionBoard.auth.admin.join(
    adminConnection,
    {
      body: {
        email: typia.random<string & typia.tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & typia.tags.Format<"uri">>(),
        referrer: typia.random<string & typia.tags.Format<"uri">>(),
        ip: typia.random<string & typia.tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardAdmin.IJoin,
    },
  );
  typia.assert(adminAuth);
  // Create article draft
  const draft =
    await api.functional.discussionBoard.admin.articles_drafts.create(
      adminConnection,
      {
        body: {
          draft_title: RandomGenerator.paragraph({ sentences: 2 }),
          draft_content: RandomGenerator.paragraph({ sentences: 5 }),
          draft_status: "draft",
          recovery_data: {
            autoSave: "true",
            version: "1.0.0",
          },
        } satisfies IDiscussionBoardArticleDraft.ICreate,
      },
    );
  typia.assert(draft);
  // Validate business logic - typia.assert already validated all types and formats
  TestValidator.equals("status is draft", draft.draft_status, "draft");
  TestValidator.equals(
    "draft_deleted_at is null",
    draft.draft_deleted_at,
    null,
  );
  TestValidator.predicate(
    "timestamps are sequential",
    draft.draft_created_at <= draft.draft_updated_at &&
      draft.draft_updated_at <= draft.last_saved_at,
  );
}
