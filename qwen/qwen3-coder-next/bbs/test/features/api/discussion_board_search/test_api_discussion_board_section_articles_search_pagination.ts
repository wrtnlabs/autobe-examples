import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_sections_articles_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_articles_create";
import { generate_random_discussion_board_super_admin_sections_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_discussion_board_section_articles_search_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super admin authentication
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: "http://localhost",
      referrer: "http://localhost",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Create test section
  const section =
    await api.functional.discussionBoard.superAdmin.sections.create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(section);
  // 3. Create test articles in target section
  const targetSectionArticles = ArrayUtil.repeat(10, (i) => ({
    title: `Article ${i + 1} - ${RandomGenerator.name(2)}`,
    content: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
  }));
  const createdArticles: IDiscussionBoardArticle[] = [];
  for (const articleData of targetSectionArticles) {
    const article =
      await api.functional.discussionBoard.superAdmin.sections.articles.create(
        superAdminConnection,
        {
          sectionId: section.id,
          body: articleData satisfies IDiscussionBoardArticle.ICreate,
        },
      );
    createdArticles.push(article);
  }
  // 4. Create articles in different section to verify isolation
  const otherSection =
    await api.functional.discussionBoard.superAdmin.sections.create(
      superAdminConnection,
      {
        body: {
          name: "Other Section",
          description: "Different section for isolation testing",
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  const otherSectionArticle =
    await api.functional.discussionBoard.superAdmin.sections.articles.create(
      superAdminConnection,
      {
        sectionId: otherSection.id,
        body: {
          title: "CompletelyUniqueArticleTitle_xyz123abc",
          content: "This should not appear in section search results",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  // 5. Test search and pagination
  // Test 1: Search with empty query - should return all articles in section
  const allArticlesResponse =
    await api.functional.discussionBoard.sections.articles.index(
      superAdminConnection,
      {
        sectionId: section.id,
        body: {
          pagination: {
            limit: 10,
            offset: 0,
            sortBy: "createdAt",
            sortOrder: "desc",
          },
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(allArticlesResponse);
  TestValidator.equals(
    "search empty query returns all articles in section",
    allArticlesResponse.data.length,
    10,
  );
  TestValidator.equals(
    "pagination metadata correct for all results",
    allArticlesResponse.pagination.records,
    10,
  );
  TestValidator.equals(
    "pagination pages correct",
    allArticlesResponse.pagination.pages,
    1,
  );
  // Test 2: Search with specific term
  const searchTerm = "Article";
  const searchResponse =
    await api.functional.discussionBoard.sections.articles.index(
      superAdminConnection,
      {
        sectionId: section.id,
        body: {
          search: searchTerm,
          pagination: {
            limit: 10,
            offset: 0,
            sortBy: "createdAt",
            sortOrder: "desc",
          },
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(searchResponse);
  TestValidator.predicate(
    "search term matches at least one article",
    searchResponse.data.length > 0,
  );
  TestValidator.predicate(
    "search results contain search term (case-insensitive)",
    searchResponse.data.every((article) =>
      article.title.toLowerCase().includes(searchTerm.toLowerCase()),
    ),
  );
  // Test 3: Pagination with limit and offset
  const paginatedResponse =
    await api.functional.discussionBoard.sections.articles.index(
      superAdminConnection,
      {
        sectionId: section.id,
        body: {
          pagination: {
            limit: 5,
            offset: 0,
            sortBy: "createdAt",
            sortOrder: "desc",
          },
          page: 1,
          limit: 5,
        },
      },
    );
  typia.assert(paginatedResponse);
  TestValidator.equals(
    "pagination limit respected",
    paginatedResponse.data.length,
    5,
  );
  TestValidator.equals(
    "pagination records count correct",
    paginatedResponse.pagination.records,
    10,
  );
  TestValidator.equals(
    "pagination pages count correct",
    paginatedResponse.pagination.pages,
    2,
  );
  // Test 4: Second page of results
  const secondPageResponse =
    await api.functional.discussionBoard.sections.articles.index(
      superAdminConnection,
      {
        sectionId: section.id,
        body: {
          pagination: {
            limit: 5,
            offset: 5,
            sortBy: "createdAt",
            sortOrder: "desc",
          },
          page: 2,
          limit: 5,
        },
      },
    );
  typia.assert(secondPageResponse);
  TestValidator.equals(
    "second page returns different articles",
    secondPageResponse.data.length,
    5,
  );
  // Test 5: Section isolation - search should not return other section articles
  const isolationResponse =
    await api.functional.discussionBoard.sections.articles.index(
      superAdminConnection,
      {
        sectionId: section.id,
        body: {
          search: "xyz123abc",
          pagination: {
            limit: 10,
            offset: 0,
            sortBy: "createdAt",
            sortOrder: "desc",
          },
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(isolationResponse);
  TestValidator.equals(
    "section isolation - other section articles not returned",
    isolationResponse.data.length,
    0,
  );
  // Test 6: Case-insensitive search
  const caseInsensitiveTerm = "ARTICLE";
  const caseInsensitiveResponse =
    await api.functional.discussionBoard.sections.articles.index(
      superAdminConnection,
      {
        sectionId: section.id,
        body: {
          search: caseInsensitiveTerm,
          pagination: {
            limit: 10,
            offset: 0,
            sortBy: "createdAt",
            sortOrder: "desc",
          },
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(caseInsensitiveResponse);
  TestValidator.predicate(
    "case-insensitive search works",
    caseInsensitiveResponse.data.length > 0,
  );
  TestValidator.equals(
    "case-insensitive search returns same results",
    caseInsensitiveResponse.data.length,
    searchResponse.data.length,
  );
  // Test 7: Verify sorting by created_at ascending
  const ascendingResponse =
    await api.functional.discussionBoard.sections.articles.index(
      superAdminConnection,
      {
        sectionId: section.id,
        body: {
          pagination: {
            limit: 10,
            offset: 0,
            sortBy: "createdAt",
            sortOrder: "asc",
          },
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(ascendingResponse);
  // Test 8: Verify sorting by created_at descending (default)
  const descendingResponse =
    await api.functional.discussionBoard.sections.articles.index(
      superAdminConnection,
      {
        sectionId: section.id,
        body: {
          pagination: {
            limit: 10,
            offset: 0,
            sortBy: "createdAt",
            sortOrder: "desc",
          },
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(descendingResponse);
  // Test 9: Empty search results
  const noResultsResponse =
    await api.functional.discussionBoard.sections.articles.index(
      superAdminConnection,
      {
        sectionId: section.id,
        body: {
          search: "nonexistentsearchterm12345xyz",
          pagination: {
            limit: 10,
            offset: 0,
            sortBy: "createdAt",
            sortOrder: "desc",
          },
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(noResultsResponse);
  TestValidator.equals(
    "nonexistent search returns empty array",
    noResultsResponse.data.length,
    0,
  );
  TestValidator.equals(
    "nonexistent search record count is 0",
    noResultsResponse.pagination.records,
    0,
  );
}
