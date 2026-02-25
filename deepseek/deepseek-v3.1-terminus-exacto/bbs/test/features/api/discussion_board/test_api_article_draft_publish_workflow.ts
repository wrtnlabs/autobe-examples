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

/**
 * Test the complete article draft publishing workflow.
 * 1. Administrator creates a complete draft with all required fields
 * 2. Administrator publishes the draft by changing status from 'draft' to 'published'
 * 3. Verify system performs additional validation for publication
 * 4. Validate timestamp updates and successful status transition
 */
export async function test_api_article_draft_publish_workflow(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as administrator
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
  // 2. Create a complete article draft with all required fields
  const draft =
    await generate_random_discussion_board_admin_articles_drafts_create(
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
  // Verify initial draft status
  TestValidator.equals("initial draft status", draft.draft_status, "draft");
  // 3. Update draft to publish status
  const publishedDraft =
    await api.functional.discussionBoard.admin.articles_drafts.update(
      adminConnection,
      {
        draftId: draft.id,
        body: {
          draft_status: "published",
        } satisfies IDiscussionBoardArticleDraft.IUpdate,
      },
    );
  typia.assert(publishedDraft);
  // 4. Validate publication results
  TestValidator.equals("draft ID unchanged", publishedDraft.id, draft.id);
  TestValidator.equals(
    "title unchanged",
    publishedDraft.draft_title,
    draft.draft_title,
  );
  TestValidator.equals(
    "content unchanged",
    publishedDraft.draft_content,
    draft.draft_content,
  );
  TestValidator.equals(
    "status changed to published",
    publishedDraft.draft_status,
    "published",
  );
  TestValidator.notEquals(
    "last_saved_at updated",
    publishedDraft.last_saved_at,
    draft.last_saved_at,
  );
  TestValidator.notEquals(
    "draft_updated_at updated",
    publishedDraft.draft_updated_at,
    draft.draft_updated_at,
  );
  TestValidator.equals(
    "draft_created_at unchanged",
    publishedDraft.draft_created_at,
    draft.draft_created_at,
  );
  // Validate timestamps are properly updated (newer timestamps)
  const originalLastSaved = new Date(draft.last_saved_at).getTime();
  const updatedLastSaved = new Date(publishedDraft.last_saved_at).getTime();
  TestValidator.predicate(
    "last_saved_at is newer",
    updatedLastSaved > originalLastSaved,
  );
  const originalUpdated = new Date(draft.draft_updated_at).getTime();
  const updatedUpdated = new Date(publishedDraft.draft_updated_at).getTime();
  TestValidator.predicate(
    "draft_updated_at is newer",
    updatedUpdated > originalUpdated,
  );
  // Validate recovery_data consistency
  TestValidator.equals(
    "recovery_data unchanged",
    publishedDraft.recovery_data,
    draft.recovery_data,
  );
  // Validate that draft_title and draft_content meet minimum quality standards (non-empty)
  TestValidator.predicate(
    "draft_title is non-empty",
    publishedDraft.draft_title.length > 0,
  );
  TestValidator.predicate(
    "draft_content is non-empty",
    publishedDraft.draft_content.length > 0,
  );
}
