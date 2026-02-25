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

export async function test_api_article_draft_retrieval_different_statuses(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super administrator
  const adminAuth = await authorize_super_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Create drafts with different statuses
  const statuses = ["draft", "published", "archived"] as const;
  const createdDrafts: IDiscussionBoardArticleDraft[] = [];
  for (const status of statuses) {
    const draft =
      await generate_random_discussion_board_super_admin_articles_drafts_create(
        adminConnection,
        {
          body: {
            draft_title: RandomGenerator.paragraph({ sentences: 2 }),
            draft_content: RandomGenerator.content({ paragraphs: 3 }),
            draft_status: status,
          } satisfies IDiscussionBoardArticleDraft.ICreate,
        },
      );
    typia.assert(draft);
    createdDrafts.push(draft);
  }
  // Test retrieval of each draft
  for (const expectedDraft of createdDrafts) {
    const retrievedDraft =
      await api.functional.discussionBoard.superAdmin.articles_drafts.at(
        adminConnection,
        {
          draftId: expectedDraft.id,
        },
      );
    typia.assert(retrievedDraft);
    // Validate draft access and status accuracy
    TestValidator.equals(
      "draft ID matches",
      retrievedDraft.id,
      expectedDraft.id,
    );
    TestValidator.equals(
      "draft title matches",
      retrievedDraft.draft_title,
      expectedDraft.draft_title,
    );
    TestValidator.equals(
      "draft content matches",
      retrievedDraft.draft_content,
      expectedDraft.draft_content,
    );
    TestValidator.equals(
      "draft status matches",
      retrievedDraft.draft_status,
      expectedDraft.draft_status,
    );
    TestValidator.predicate(
      "last_saved_at is valid",
      typeof retrievedDraft.last_saved_at === "string",
    );
    TestValidator.predicate(
      "draft_created_at is valid",
      typeof retrievedDraft.draft_created_at === "string",
    );
    TestValidator.predicate(
      "draft_updated_at is valid",
      typeof retrievedDraft.draft_updated_at === "string",
    );
  }
}
