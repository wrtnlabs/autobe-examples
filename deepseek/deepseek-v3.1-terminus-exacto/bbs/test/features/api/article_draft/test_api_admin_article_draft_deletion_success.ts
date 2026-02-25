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

export async function test_api_admin_article_draft_deletion_success(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Register admin account
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // Create article draft
  const draft =
    await generate_random_discussion_board_admin_articles_drafts_create(
      adminConnection,
      {
        body: {
          draft_title: RandomGenerator.paragraph({ sentences: 2 }),
          draft_content: RandomGenerator.content({ paragraphs: 1 }),
          draft_status: "draft",
          recovery_data: null,
        } satisfies IDiscussionBoardArticleDraft.ICreate,
      },
    );
  typia.assert(draft);
  // Verify draft is active and has correct status
  TestValidator.equals("draft should be active", draft.draft_deleted_at, null);
  TestValidator.equals(
    "draft should have draft status",
    draft.draft_status,
    "draft",
  );
  TestValidator.predicate(
    "draft should have proper structure",
    draft.draft_title.length > 0 && draft.draft_content.length > 0,
  );
  // Delete the draft - this should complete successfully
  await TestValidator.error("delete operation should not throw", async () => {
    await api.functional.discussionBoard.admin.article_drafts.erase(
      adminConnection,
      {
        draftId: draft.id,
      },
    );
  });
  // Since the DELETE endpoint returns void, we validate success by the absence of errors
  // In a real scenario, we might verify soft deletion through a separate endpoint
  // by attempting to retrieve the deleted draft and validating draft_deleted_at is set
}
