import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_administrator_sections_create } from "../../../generate/generate_random_discussion_board_administrator_sections_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test that an administrator can successfully update any article, including articles authored by other members.
 * Validates the dual authorization model where administrators have elevated permissions to update any article.
 */
export async function test_api_article_update_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member setup - register and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Administrator setup - register and authenticate to create sections
  const adminSetupConnection: api.IConnection = { host: connection.host };
  const adminAuthSetup = await authorize_administrator_join(
    adminSetupConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "1234",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardAdministrator.IJoin,
    },
  );
  typia.assert(adminAuthSetup);
  // 3. Create first section for the original article
  const section1 =
    await generate_random_discussion_board_administrator_sections_create(
      adminSetupConnection,
      {
        body: {
          name: "Original Section",
          description: "First section for testing",
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(section1);
  // 4. Create article as member
  const originalTitle = RandomGenerator.paragraph({ sentences: 3 });
  const originalContent = RandomGenerator.content({ paragraphs: 2 });
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        title: originalTitle,
        content: originalContent,
        section_id: section1.id,
        tags: ["test", "article"],
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 5. Create second section for reassignment test
  const section2 =
    await generate_random_discussion_board_administrator_sections_create(
      adminSetupConnection,
      {
        body: {
          name: "Reassigned Section",
          description: "Second section for reassignment testing",
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(section2);
  // 6. Administrator login for update operation
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_login(adminConnection, {
    body: {
      email: adminAuthSetup.email,
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdministrator.ILogin,
  });
  typia.assert(adminAuth);
  // 7. Prepare update data
  const newTitle = RandomGenerator.paragraph({ sentences: 4 });
  const newContent = RandomGenerator.content({ paragraphs: 3 });
  // 8. Administrator updates the member's article
  const updatedArticle =
    await api.functional.discussionBoard.member.articles.update(
      adminConnection,
      {
        articleId: article.id,
        body: {
          title: newTitle,
          content: newContent,
          sectionId: section2.id,
        } satisfies IDiscussionBoardArticle.IUpdate,
      },
    );
  typia.assert(updatedArticle);
  // 9. Validate the updated article
  TestValidator.equals("title was updated", updatedArticle.title, newTitle);
  TestValidator.equals(
    "content was updated",
    updatedArticle.content,
    newContent,
  );
  TestValidator.notEquals(
    "title changed from original",
    updatedArticle.title,
    originalTitle,
  );
  TestValidator.notEquals(
    "content changed from original",
    updatedArticle.content,
    originalContent,
  );
  TestValidator.equals(
    "section was reassigned",
    updatedArticle.section.id,
    section2.id,
  );
  TestValidator.equals(
    "section name matches new section",
    updatedArticle.section.name,
    section2.name,
  );
  TestValidator.notEquals(
    "section changed from original",
    updatedArticle.section.id,
    section1.id,
  );
  TestValidator.equals(
    "author preserved",
    updatedArticle.author.id,
    article.author.id,
  );
  TestValidator.equals(
    "author email preserved",
    updatedArticle.author.email,
    article.author.email,
  );
  TestValidator.equals(
    "created_at immutable",
    updatedArticle.created_at,
    article.created_at,
  );
  TestValidator.predicate(
    "updated_at changed",
    updatedArticle.updated_at !== article.updated_at,
  );
  TestValidator.equals(
    "deleted_at remains null",
    updatedArticle.deleted_at,
    null,
  );
  TestValidator.predicate(
    "article is active",
    updatedArticle.deleted_at === null,
  );
  TestValidator.equals("article id preserved", updatedArticle.id, article.id);
}
