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
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { prepare_random_discussion_board_article_draft } from "../../../prepare/prepare_random_discussion_board_article_draft";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_admin_article_draft_authorization_required(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin12345",
      display_name: RandomGenerator.name(),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create section as admin
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // 3. Create draft as admin
  const draft =
    await generate_random_discussion_board_admin_articles_drafts_create(
      adminConnection,
      {
        body: {
          draft_title: RandomGenerator.paragraph({ sentences: 2 }),
          draft_content: RandomGenerator.content({ paragraphs: 2 }),
          draft_status: "draft",
        } satisfies IDiscussionBoardArticleDraft.ICreate,
      },
    );
  typia.assert(draft);
  // 4. Create unauthenticated connection for unauthorized test
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  // Ensure no Authorization headers exist
  unauthorizedConnection.headers = {};
  // 5. Attempt to publish draft without authentication - should fail
  await TestValidator.httpError(
    "must fail with 401 unauthorized when not authenticated",
    401,
    async () =>
      await api.functional.discussionBoard.admin.articles_drafts.publish(
        unauthorizedConnection,
        {
          draftId: draft.id,
          body: {
            section_id: section.id,
          } satisfies IDiscussionBoardArticleDraft.IPublish,
        },
      ),
  );
  // 6. Use the already authenticated admin connection to publish successfully
  const publishedArticle =
    await api.functional.discussionBoard.admin.articles_drafts.publish(
      adminConnection,
      {
        draftId: draft.id,
        body: {
          section_id: section.id,
        } satisfies IDiscussionBoardArticleDraft.IPublish,
      },
    );
  typia.assert(publishedArticle);
  // 7. Validate published article data
  TestValidator.equals(
    "article title should match draft title",
    publishedArticle.title,
    draft.draft_title,
  );
  TestValidator.equals(
    "article content should match draft content",
    publishedArticle.content,
    draft.draft_content,
  );
  TestValidator.equals(
    "article section should match section",
    publishedArticle.section.id,
    section.id,
  );
}
