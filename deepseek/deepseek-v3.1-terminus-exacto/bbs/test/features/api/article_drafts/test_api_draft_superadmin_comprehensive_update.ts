import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticleDraft } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleDraft";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_articles_drafts_create } from "../../../generate/generate_random_discussion_board_super_admin_articles_drafts_create";
import { prepare_random_discussion_board_article_draft } from "../../../prepare/prepare_random_discussion_board_article_draft";

export async function test_api_draft_superadmin_comprehensive_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as superAdmin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(authorized);
  // 2. Create initial draft
  const initialDraft =
    await generate_random_discussion_board_super_admin_articles_drafts_create(
      superAdminConnection,
      {
        body: {
          draft_title: RandomGenerator.paragraph({ sentences: 1 }),
          draft_content: RandomGenerator.content({ paragraphs: 2 }),
          draft_status: "draft",
        } satisfies IDiscussionBoardArticleDraft.ICreate,
      },
    );
  typia.assert(initialDraft);
  // 3. Update draft with new values
  const updateData: IDiscussionBoardArticleDraft.IUpdate = {
    draft_title: RandomGenerator.paragraph({ sentences: 1 }),
    draft_content: RandomGenerator.content({ paragraphs: 3 }),
    draft_status: "published",
  };
  const updatedDraft =
    await api.functional.discussionBoard.superAdmin.articles_drafts.update(
      superAdminConnection,
      {
        draftId: initialDraft.id,
        body: updateData,
      },
    );
  typia.assert(updatedDraft);
  // 4. Validate changes
  TestValidator.equals(
    "draft ID remains the same",
    updatedDraft.id,
    initialDraft.id,
  );
  TestValidator.equals(
    "draft title updated",
    updatedDraft.draft_title,
    updateData.draft_title,
  );
  TestValidator.equals(
    "draft content updated",
    updatedDraft.draft_content,
    updateData.draft_content,
  );
  TestValidator.equals(
    "draft status updated",
    updatedDraft.draft_status,
    updateData.draft_status,
  );
  // 5. Validate timestamp behavior
  TestValidator.predicate(
    "last_saved_at should be updated",
    updatedDraft.last_saved_at > initialDraft.last_saved_at,
  );
  TestValidator.equals(
    "draft_created_at preserved",
    updatedDraft.draft_created_at,
    initialDraft.draft_created_at,
  );
  TestValidator.notEquals(
    "draft_updated_at should be different",
    updatedDraft.draft_updated_at,
    initialDraft.draft_updated_at,
  );
  // 6. Validate unchanged optional fields
  TestValidator.equals(
    "recovery_data unchanged",
    updatedDraft.recovery_data,
    initialDraft.recovery_data,
  );
  TestValidator.equals(
    "draft_deleted_at unchanged",
    updatedDraft.draft_deleted_at,
    initialDraft.draft_deleted_at,
  );
}
