import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
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
import { generate_random_discussion_board_admin_articles_create } from "../../../generate/generate_random_discussion_board_admin_articles_create";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_article_admin_access_various_section_articles(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      href: "https://test.com",
      referrer: "https://referrer.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Create multiple sections with different statuses
  const activeSection =
    await generate_random_discussion_board_admin_sections_create(
      adminConnection,
      {
        body: {
          name: "Active Section",
          description: RandomGenerator.paragraph({ sentences: 2 }),
          status: "active",
          display_order: 1,
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(activeSection);
  const inactiveSection =
    await generate_random_discussion_board_admin_sections_create(
      adminConnection,
      {
        body: {
          name: "Inactive Section",
          description: RandomGenerator.paragraph({ sentences: 2 }),
          status: "inactive",
          display_order: 2,
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(inactiveSection);
  const archivedSection =
    await generate_random_discussion_board_admin_sections_create(
      adminConnection,
      {
        body: {
          name: "Archived Section",
          description: RandomGenerator.paragraph({ sentences: 2 }),
          status: "archived",
          display_order: 3,
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(archivedSection);
  // Create articles in each section
  const activeSectionArticle =
    await generate_random_discussion_board_admin_articles_create(
      adminConnection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 5,
            wordMax: 8,
          }),
          content: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 10,
            wordMax: 20,
          }),
          discussion_board_section_id: activeSection.id,
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(activeSectionArticle);
  const inactiveSectionArticle =
    await generate_random_discussion_board_admin_articles_create(
      adminConnection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 5,
            wordMax: 8,
          }),
          content: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 10,
            wordMax: 20,
          }),
          discussion_board_section_id: inactiveSection.id,
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(inactiveSectionArticle);
  const archivedSectionArticle =
    await generate_random_discussion_board_admin_articles_create(
      adminConnection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 5,
            wordMax: 8,
          }),
          content: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 10,
            wordMax: 20,
          }),
          discussion_board_section_id: archivedSection.id,
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(archivedSectionArticle);
  // Test admin access to articles from all sections
  const retrievedActiveArticle =
    await api.functional.discussionBoard.admin.articles.at(adminConnection, {
      articleId: activeSectionArticle.id,
    });
  typia.assert(retrievedActiveArticle);
  TestValidator.equals(
    "active section article ID",
    retrievedActiveArticle.id,
    activeSectionArticle.id,
  );
  TestValidator.equals(
    "active section article section ID",
    retrievedActiveArticle.section.id,
    activeSection.id,
  );
  TestValidator.equals(
    "active section article section name",
    retrievedActiveArticle.section.name,
    activeSection.name,
  );
  const retrievedInactiveArticle =
    await api.functional.discussionBoard.admin.articles.at(adminConnection, {
      articleId: inactiveSectionArticle.id,
    });
  typia.assert(retrievedInactiveArticle);
  TestValidator.equals(
    "inactive section article ID",
    retrievedInactiveArticle.id,
    inactiveSectionArticle.id,
  );
  TestValidator.equals(
    "inactive section article section ID",
    retrievedInactiveArticle.section.id,
    inactiveSection.id,
  );
  TestValidator.equals(
    "inactive section article section name",
    retrievedInactiveArticle.section.name,
    inactiveSection.name,
  );
  const retrievedArchivedArticle =
    await api.functional.discussionBoard.admin.articles.at(adminConnection, {
      articleId: archivedSectionArticle.id,
    });
  typia.assert(retrievedArchivedArticle);
  TestValidator.equals(
    "archived section article ID",
    retrievedArchivedArticle.id,
    archivedSectionArticle.id,
  );
  TestValidator.equals(
    "archived section article section ID",
    retrievedArchivedArticle.section.id,
    archivedSection.id,
  );
  TestValidator.equals(
    "archived section article section name",
    retrievedArchivedArticle.section.name,
    archivedSection.name,
  );
  // Validate cross-section access works properly
  TestValidator.notEquals(
    "different section articles have different IDs",
    retrievedActiveArticle.id,
    retrievedInactiveArticle.id,
  );
  TestValidator.notEquals(
    "different sections have different IDs",
    retrievedActiveArticle.section.id,
    retrievedInactiveArticle.section.id,
  );
  TestValidator.predicate(
    "all articles have valid timestamps",
    new Date(retrievedActiveArticle.created_at) <=
      new Date(retrievedActiveArticle.updated_at) &&
      new Date(retrievedInactiveArticle.created_at) <=
        new Date(retrievedInactiveArticle.updated_at) &&
      new Date(retrievedArchivedArticle.created_at) <=
        new Date(retrievedArchivedArticle.updated_at),
  );
}
