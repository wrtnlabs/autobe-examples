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

export async function test_api_admin_article_draft_publish_with_minimum_content(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IDiscussionBoardAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // 2. Create a section for the article
  const section: IDiscussionBoardSection =
    await generate_random_discussion_board_admin_sections_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          status: "active",
          display_order: 1,
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(section);
  // 3. Create draft with minimum content: exactly 5 character title and 50 character content
  const draftTitle = RandomGenerator.alphabets(5); // Exactly minimum 5 characters
  const draftContent = RandomGenerator.alphabets(50); // Exactly minimum 50 characters
  const draft: IDiscussionBoardArticleDraft =
    await generate_random_discussion_board_admin_articles_drafts_create(
      adminConnection,
      {
        body: {
          draft_title: draftTitle,
          draft_content: draftContent,
          draft_status: "draft",
          recovery_data: null,
        } satisfies IDiscussionBoardArticleDraft.ICreate,
      },
    );
  typia.assert(draft);
  // 4. Publish the draft
  const publishedArticle: IDiscussionBoardArticle =
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
  // 5. Validate successful publication
  TestValidator.equals(
    "draft title matches published article title",
    publishedArticle.title,
    draftTitle,
  );
  TestValidator.equals(
    "draft content matches published article content",
    publishedArticle.content,
    draftContent,
  );
  TestValidator.equals(
    "article belongs to correct section",
    publishedArticle.section.id,
    section.id,
  );
  TestValidator.predicate(
    "article has valid author",
    publishedArticle.author.id !== "",
  );
  TestValidator.predicate(
    "article has creation timestamp",
    publishedArticle.created_at !== "",
  );
  TestValidator.predicate(
    "article title meets minimum length requirement",
    publishedArticle.title.length >= 5,
  );
  TestValidator.predicate(
    "article content meets minimum length requirement",
    publishedArticle.content.length >= 50,
  );
}