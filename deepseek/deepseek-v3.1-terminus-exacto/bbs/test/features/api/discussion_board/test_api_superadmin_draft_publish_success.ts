import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleDraft } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleDraft";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
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
import { generate_random_discussion_board_super_admin_sections_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_create";
import { prepare_random_discussion_board_article_draft } from "../../../prepare/prepare_random_discussion_board_article_draft";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_superadmin_draft_publish_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as superAdmin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "superadmin123",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
      ip: "127.0.0.1" as string & tags.Format<"ipv4">,
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(auth);
  // 2. Create a section for article organization
  const section =
    await generate_random_discussion_board_super_admin_sections_create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          status: "active",
          display_order: 1,
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(section);
  // 3. Create a draft article
  const draft =
    await generate_random_discussion_board_super_admin_articles_drafts_create(
      superAdminConnection,
      {
        body: {
          draft_title: RandomGenerator.paragraph({ sentences: 2 }),
          draft_content: RandomGenerator.paragraph({ sentences: 5 }),
          draft_status: "draft",
          recovery_data: null,
        } satisfies IDiscussionBoardArticleDraft.ICreate,
      },
    );
  typia.assert(draft);
  // 4. Publish the draft
  const publishedArticle =
    await api.functional.discussionBoard.superAdmin.articles_drafts.publish(
      superAdminConnection,
      {
        draftId: draft.id,
        body: {
          section_id: section.id,
        } satisfies IDiscussionBoardArticleDraft.IPublish,
      },
    );
  typia.assert(publishedArticle);
  // 5. Validate the publication results
  TestValidator.equals(
    "article title matches draft title",
    publishedArticle.title,
    draft.draft_title,
  );
  TestValidator.equals(
    "article content matches draft content",
    publishedArticle.content,
    draft.draft_content,
  );
  TestValidator.equals(
    "section assignment is correct",
    publishedArticle.section.id,
    section.id,
  );
  TestValidator.predicate(
    "article has valid author information",
    publishedArticle.author !== null,
  );
  TestValidator.predicate(
    "article has creation timestamp",
    publishedArticle.created_at !== null,
  );
  TestValidator.predicate(
    "article has valid status",
    publishedArticle.status === "published",
  );
  TestValidator.predicate(
    "published article should not be deleted",
    publishedArticle.deleted_at === null,
  );
}
