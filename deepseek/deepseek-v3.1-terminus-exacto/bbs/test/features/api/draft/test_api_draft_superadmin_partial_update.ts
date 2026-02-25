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

export async function test_api_draft_superadmin_partial_update(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as superAdmin using utility function
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  typia.assert(superAdminAuth);
  // Create a comprehensive draft with complete data
  const originalDraft =
    await api.functional.discussionBoard.superAdmin.articles_drafts.create(
      superAdminConnection,
      {
        body: {
          draft_title: RandomGenerator.paragraph({ sentences: 2 }),
          draft_content: RandomGenerator.content({ paragraphs: 3 }),
          draft_status: "draft",
          recovery_data: {
            autosave_version: "1.0",
            last_session: new Date().toISOString(),
          },
        } satisfies IDiscussionBoardArticleDraft.ICreate,
      },
    );
  typia.assert(originalDraft);
  // Store original values before partial update
  const originalTitle = originalDraft.draft_title;
  const originalContent = originalDraft.draft_content;
  const originalStatus = originalDraft.draft_status;
  const originalCreatedAt = originalDraft.draft_created_at;
  // Perform partial update - only change the title
  const updateResponse =
    await api.functional.discussionBoard.superAdmin.articles_drafts.update(
      superAdminConnection,
      {
        draftId: originalDraft.id,
        body: {
          draft_title: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardArticleDraft.IUpdate,
      },
    );
  typia.assert(updateResponse);
  // Validate that only the title changed
  TestValidator.notEquals(
    "draft title should be updated",
    updateResponse.draft_title,
    originalTitle,
  );
  TestValidator.equals(
    "draft content should remain unchanged",
    updateResponse.draft_content,
    originalContent,
  );
  TestValidator.equals(
    "draft status should remain unchanged",
    updateResponse.draft_status,
    originalStatus,
  );
  // Validate that draft_created_at timestamp is preserved
  TestValidator.equals(
    "draft creation timestamp should remain intact",
    updateResponse.draft_created_at,
    originalCreatedAt,
  );
  // Validate that timestamps were updated
  TestValidator.notEquals(
    "last_saved_at should be updated",
    updateResponse.last_saved_at,
    originalDraft.last_saved_at,
  );
  TestValidator.notEquals(
    "draft_updated_at should be updated",
    updateResponse.draft_updated_at,
    originalDraft.draft_updated_at,
  );
  // Validate that recovery_data field is properly handled (should not change)
  TestValidator.equals(
    "recovery_data should remain unchanged",
    updateResponse.recovery_data,
    originalDraft.recovery_data,
  );
}
