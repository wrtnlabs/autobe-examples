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
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { generate_random_discussion_board_user_articles_drafts_create } from "../../../generate/generate_random_discussion_board_user_articles_drafts_create";
import { prepare_random_discussion_board_article_draft } from "../../../prepare/prepare_random_discussion_board_article_draft";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_article_draft_publish_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup: create admin account, login, and create a section
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
  const adminLoginConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_login(adminLoginConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  const section = await generate_random_discussion_board_admin_sections_create(
    adminLoginConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        status: "active",
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<0>
        >() satisfies number as number,
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // 2. User setup: create user account and login
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  const userLoginConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_login(userLoginConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardUser.ILogin,
  });
  // 3. Create article draft
  const draft =
    await generate_random_discussion_board_user_articles_drafts_create(
      userLoginConnection,
      {
        body: {
          draft_title: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 2,
            wordMax: 7,
          }),
          draft_content: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 3,
            sentenceMax: 6,
          }),
          draft_status: "draft",
          recovery_data: null,
        } satisfies IDiscussionBoardArticleDraft.ICreate,
      },
    );
  typia.assert(draft);
  // 4. Validate draft is in correct status
  TestValidator.equals(
    "draft status should be 'draft'",
    draft.draft_status,
    "draft",
  );
  // 5. Publish the draft
  const article =
    await api.functional.discussionBoard.user.articles_drafts.publish(
      userLoginConnection,
      {
        draftId: draft.id,
        body: {
          section_id: section.id,
        } satisfies IDiscussionBoardArticleDraft.IPublish,
      },
    );
  typia.assert(article);
  // 6. Validate published article content matches draft
  TestValidator.equals(
    "article title matches draft title",
    article.title,
    draft.draft_title,
  );
  TestValidator.equals(
    "article content matches draft content",
    article.content,
    draft.draft_content,
  );
  // 7. Validate article metadata
  TestValidator.equals(
    "article section matches published section",
    article.section.id,
    section.id,
  );
  TestValidator.equals(
    "article author matches user id",
    article.author.id,
    userAuth.id,
  );
  // 8. Additional business validations
  TestValidator.predicate(
    "article has creation timestamp",
    article.created_at !== null && article.created_at !== undefined,
  );
  TestValidator.predicate(
    "article has update timestamp",
    article.updated_at !== null && article.updated_at !== undefined,
  );
  TestValidator.equals("article not deleted", article.deleted_at, null);
}
