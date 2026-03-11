import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test pagination and sorting functionality when browsing articles in a section.
 *
 * 1. Admin joins and creates a test section
 * 2. Member joins and creates multiple articles (at least 25 to test pagination)
 * 3. Test default pagination (page 1, limit 20)
 * 4. Test custom pagination (page 2, limit 10)
 * 5. Test sorting by created_at descending (default)
 * 6. Test sorting by created_at ascending
 * 7. Test sorting by title alphabetically
 * 8. Validate pagination metadata accuracy
 */
export async function test_api_section_articles_pagination_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create section
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  const section = await api.functional.discussionBoard.admin.sections.create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // 2. Member setup - create articles
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberAuth);
  // Create 25 articles with different titles and timestamps
  const articleCount = 25;
  const articles: IDiscussionBoardArticle[] = [];
  for (let i = 0; i < articleCount; i++) {
    const article = await api.functional.discussionBoard.member.articles.create(
      memberConnection,
      {
        body: {
          title: `Article ${i + 1} - ${RandomGenerator.name()}`,
          body: RandomGenerator.content({ paragraphs: 2 }),
          discussion_board_section_id: section.id,
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
    typia.assert(article);
    articles.push(article);
    // Small delay to ensure different timestamps
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  // 3. Test default pagination (page 1, limit 20)
  const defaultPage =
    await api.functional.discussionBoard.sections.articles.index(connection, {
      sectionId: section.id,
      body: {
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(defaultPage);
  TestValidator.equals(
    "default page current",
    defaultPage.pagination.current,
    1,
  );
  TestValidator.equals("default page limit", defaultPage.pagination.limit, 20);
  TestValidator.equals(
    "default page records",
    defaultPage.pagination.records,
    articleCount,
  );
  TestValidator.equals("default page pages", defaultPage.pagination.pages, 2);
  TestValidator.predicate(
    "default page data count",
    defaultPage.data.length === 20,
  );
  // 4. Test custom pagination (page 2, limit 10)
  const customPage =
    await api.functional.discussionBoard.sections.articles.index(connection, {
      sectionId: section.id,
      body: {
        page: 2,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(customPage);
  TestValidator.equals("custom page current", customPage.pagination.current, 2);
  TestValidator.equals("custom page limit", customPage.pagination.limit, 10);
  TestValidator.equals(
    "custom page records",
    customPage.pagination.records,
    articleCount,
  );
  TestValidator.equals("custom page pages", customPage.pagination.pages, 3);
  TestValidator.predicate(
    "custom page data count",
    customPage.data.length === 10,
  );
  // 5. Test sorting by created_at descending (default)
  const descSort = await api.functional.discussionBoard.sections.articles.index(
    connection,
    {
      sectionId: section.id,
      body: {
        sortBy: "created_at",
        sortOrder: "desc",
        limit: 5,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(descSort);
  // Verify newest articles come first
  for (let i = 1; i < descSort.data.length; i++) {
    TestValidator.predicate(
      `descending order at index ${i}`,
      descSort.data[i - 1].created_at >= descSort.data[i].created_at,
    );
  }
  // 6. Test sorting by created_at ascending
  const ascSort = await api.functional.discussionBoard.sections.articles.index(
    connection,
    {
      sectionId: section.id,
      body: {
        sortBy: "created_at",
        sortOrder: "asc",
        limit: 5,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(ascSort);
  // Verify oldest articles come first
  for (let i = 1; i < ascSort.data.length; i++) {
    TestValidator.predicate(
      `ascending order at index ${i}`,
      ascSort.data[i - 1].created_at <= ascSort.data[i].created_at,
    );
  }
  // 7. Test sorting by title alphabetically
  const titleSort =
    await api.functional.discussionBoard.sections.articles.index(connection, {
      sectionId: section.id,
      body: {
        sortBy: "title",
        sortOrder: "asc",
        limit: 5,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(titleSort);
  // Verify alphabetical order
  for (let i = 1; i < titleSort.data.length; i++) {
    TestValidator.predicate(
      `title alphabetical order at index ${i}`,
      titleSort.data[i - 1].title <= titleSort.data[i].title,
    );
  }
  // 8. Test pagination metadata accuracy with different page sizes
  const testPageSizes = [1, 5, 10, 20, 50, 100];
  for (const pageSize of testPageSizes) {
    const pageResult =
      await api.functional.discussionBoard.sections.articles.index(connection, {
        sectionId: section.id,
        body: {
          page: 1,
          limit: pageSize,
        } satisfies IDiscussionBoardArticle.IRequest,
      });
    typia.assert(pageResult);
    const expectedPages = Math.ceil(articleCount / pageSize);
    TestValidator.equals(
      `pagination pages with limit ${pageSize}`,
      pageResult.pagination.pages,
      expectedPages,
    );
    TestValidator.equals(
      `pagination records with limit ${pageSize}`,
      pageResult.pagination.records,
      articleCount,
    );
  }
  // 9. Test pagination boundaries
  // Page 1 should be first page
  const firstPage =
    await api.functional.discussionBoard.sections.articles.index(connection, {
      sectionId: section.id,
      body: {
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    });
  typia.assert(firstPage);
  TestValidator.equals("first page number", firstPage.pagination.current, 1);
  // Last page should have correct page number
  const lastPageNum = Math.ceil(articleCount / 10);
  const lastPage = await api.functional.discussionBoard.sections.articles.index(
    connection,
    {
      sectionId: section.id,
      body: {
        page: lastPageNum,
        limit: 10,
      } satisfies IDiscussionBoardArticle.IRequest,
    },
  );
  typia.assert(lastPage);
  TestValidator.equals(
    "last page number",
    lastPage.pagination.current,
    lastPageNum,
  );
  TestValidator.equals(
    "last page matches total pages",
    lastPage.pagination.current,
    lastPage.pagination.pages,
  );
}
