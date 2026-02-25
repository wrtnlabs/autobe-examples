import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleDraft } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleDraft";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
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
import { generate_random_discussion_board_admin_articles_drafts_create } from "../../../generate/generate_random_discussion_board_admin_articles_drafts_create";
import { prepare_random_discussion_board_article_draft } from "../../../prepare/prepare_random_discussion_board_article_draft";

export async function test_api_admin_article_draft_retrieval_published_status(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
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
  // Step 2: Create article draft
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
  // Step 3: Publish the draft (need a section ID - generate random UUID)
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  const publishedArticle =
    await api.functional.discussionBoard.admin.articles_drafts.publish(
      adminConnection,
      {
        draftId: draft.id,
        body: {
          section_id: sectionId,
        } satisfies IDiscussionBoardArticleDraft.IPublish,
      },
    );
  typia.assert(publishedArticle);
  // Step 4: Retrieve the published draft
  const retrievedDraft =
    await api.functional.discussionBoard.admin.articles_drafts.at(
      adminConnection,
      {
        draftId: draft.id,
      },
    );
  typia.assert(retrievedDraft);
  // Step 5: Validate
  TestValidator.equals(
    "draft_status should be 'published'",
    retrievedDraft.draft_status,
    "published",
  );
  TestValidator.equals(
    "draft title should match",
    retrievedDraft.draft_title,
    draft.draft_title,
  );
  TestValidator.equals(
    "draft content should match",
    retrievedDraft.draft_content,
    draft.draft_content,
  );
  TestValidator.equals("draft ID should match", retrievedDraft.id, draft.id);
  TestValidator.predicate(
    "last_saved_at should be valid date",
    new Date(retrievedDraft.last_saved_at).toString() !== "Invalid Date",
  );
  TestValidator.predicate(
    "draft_created_at should be valid date",
    new Date(retrievedDraft.draft_created_at).toString() !== "Invalid Date",
  );
  TestValidator.predicate(
    "draft_updated_at should be valid date",
    new Date(retrievedDraft.draft_updated_at).toString() !== "Invalid Date",
  );
  // recovery_data should be null as we set it
  TestValidator.equals(
    "recovery_data should be null",
    retrievedDraft.recovery_data,
    null,
  );
  // draft_deleted_at should be null (not soft-deleted)
  TestValidator.equals(
    "draft_deleted_at should be null",
    retrievedDraft.draft_deleted_at,
    null,
  );
}
