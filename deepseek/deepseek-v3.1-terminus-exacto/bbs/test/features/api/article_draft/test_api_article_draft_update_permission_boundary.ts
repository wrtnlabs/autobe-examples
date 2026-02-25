import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticleDraft } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleDraft";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_admin_articles_drafts_create } from "../../../generate/generate_random_discussion_board_admin_articles_drafts_create";
import { prepare_random_discussion_board_article_draft } from "../../../prepare/prepare_random_discussion_board_article_draft";

/**
 * Test that only administrators can update article drafts as specified by authorizationActor 'admin'.
 * 1. Admin creates draft
 * 2. User attempts to update (should fail)
 * 3. Admin updates draft (should succeed)
 */
export async function test_api_article_draft_update_permission_boundary(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup and create draft
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  const draft =
    await api.functional.discussionBoard.admin.articles_drafts.create(
      adminConnection,
      {
        body: {
          draft_title: RandomGenerator.paragraph({ sentences: 2 }),
          draft_content: RandomGenerator.content({ paragraphs: 3 }),
          draft_status: "draft",
        } satisfies IDiscussionBoardArticleDraft.ICreate,
      },
    );
  typia.assert(draft);
  // 2. Regular user setup and attempt to update (should fail)
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  await TestValidator.error("user cannot update admin draft", async () => {
    await api.functional.discussionBoard.admin.articles_drafts.update(
      userConnection,
      {
        draftId: draft.id,
        body: {
          draft_title: "Updated by user",
        } satisfies IDiscussionBoardArticleDraft.IUpdate,
      },
    );
  });
  // 3. Admin updates draft successfully
  const updateBody = {
    draft_title: RandomGenerator.paragraph({ sentences: 3 }),
    draft_content: RandomGenerator.content({ paragraphs: 4 }),
    draft_status: "draft",
  } satisfies IDiscussionBoardArticleDraft.IUpdate;
  const updatedDraft =
    await api.functional.discussionBoard.admin.articles_drafts.update(
      adminConnection,
      {
        draftId: draft.id,
        body: updateBody,
      },
    );
  typia.assert(updatedDraft);
  // 4. Validate the update
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
  TestValidator.equals("status unchanged", updatedDraft.draft_status, "draft");
  TestValidator.predicate(
    "updated timestamp should be more recent",
    new Date(updatedDraft.draft_updated_at).getTime() >=
      new Date(draft.draft_updated_at).getTime(),
  );
}
