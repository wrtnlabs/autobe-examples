import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
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
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { generate_random_discussion_board_super_admin_sections_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test super admin search functionality with empty results and pagination scenarios.
 * 1. Setup: Authenticate super admin, create sections
 * 2. Create member users and articles with specific content
 * 3. Perform searches that return zero results
 * 4. Test pagination boundaries and edge cases
 * 5. Validate empty response handling and pagination metadata
 */
export async function test_api_super_admin_search_empty_results_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super admin authentication
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Login super admin to ensure proper authentication
  await authorize_super_admin_login(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com",
      referrer: "https://example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.ILogin,
  });
  // 2. Create sections
  const section1 =
    await generate_random_discussion_board_super_admin_sections_create(
      superAdminConnection,
      {
        body: {
          name: "Technology",
          description: "Technology related discussions",
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(section1);
  const section2 =
    await generate_random_discussion_board_super_admin_sections_create(
      superAdminConnection,
      {
        body: {
          name: "Science",
          description: "Science related discussions",
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(section2);
  // 3. Member authentication and article creation
  const memberConnection1: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection1, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: "https://example.com",
      referrer: "https://example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  // Login member to ensure proper authentication
  await authorize_member_login(memberConnection1, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardMember.ILogin,
  });
  // Create articles with specific content that won't match test searches
  const article1 =
    await generate_random_discussion_board_member_articles_create(
      memberConnection1,
      {
        body: {
          title: "Introduction to Programming",
          body: "This article discusses basic programming concepts",
          discussion_board_section_id: section1.id,
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article1);
  const article2 =
    await generate_random_discussion_board_member_articles_create(
      memberConnection1,
      {
        body: {
          title: "Advanced Mathematics",
          body: "Exploring complex mathematical theories",
          discussion_board_section_id: section2.id,
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article2);
  const memberConnection2: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection2, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: "https://example.com",
      referrer: "https://example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  // Login second member
  await authorize_member_login(memberConnection2, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardMember.ILogin,
  });
  const article3 =
    await generate_random_discussion_board_member_articles_create(
      memberConnection2,
      {
        body: {
          title: "Physics Fundamentals",
          body: "Basic principles of physics",
          discussion_board_section_id: section1.id,
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article3);
  // 4. Test empty search results
  const emptySearchResult =
    await api.functional.discussionBoard.superAdmin.search.index(
      superAdminConnection,
      {
        body: {
          search: "nonexistentkeyword12345xyz", // Very specific search that won't match
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(emptySearchResult);
  // Validate empty result set
  TestValidator.equals(
    "empty search results count",
    emptySearchResult.data.length,
    0,
  );
  TestValidator.equals(
    "empty search records count",
    emptySearchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty search pages count",
    emptySearchResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty search current page",
    emptySearchResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty search limit",
    emptySearchResult.pagination.limit,
    10,
  ); // Default limit
  // 5. Test pagination with empty results
  const paginationEmptyResult =
    await api.functional.discussionBoard.superAdmin.search.index(
      superAdminConnection,
      {
        body: {
          search: "completelyuniquenonexistentterm",
          page: 5, // Request page beyond available results
          limit: 20,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(paginationEmptyResult);
  TestValidator.equals(
    "pagination empty results count",
    paginationEmptyResult.data.length,
    0,
  );
  TestValidator.equals(
    "pagination empty records count",
    paginationEmptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination empty pages count",
    paginationEmptyResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "pagination empty current page",
    paginationEmptyResult.pagination.current,
    5,
  );
  TestValidator.equals(
    "pagination empty limit",
    paginationEmptyResult.pagination.limit,
    20,
  );
  // 6. Test search with specific criteria that should match nothing
  const specificEmptySearch =
    await api.functional.discussionBoard.superAdmin.search.index(
      superAdminConnection,
      {
        body: {
          search: "quantum mechanics astrophysics", // Complex term unlikely to match
          discussion_board_section_id: typia.random<
            string & tags.Format<"uuid">
          >(), // Non-existent section
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(specificEmptySearch);
  TestValidator.equals(
    "specific empty search results count",
    specificEmptySearch.data.length,
    0,
  );
  TestValidator.equals(
    "specific empty search records count",
    specificEmptySearch.pagination.records,
    0,
  );
  // 7. Test custom page size with empty results
  const customPageSizeEmpty =
    await api.functional.discussionBoard.superAdmin.search.index(
      superAdminConnection,
      {
        body: {
          search: "unmatchedsearchterm",
          page: 1,
          limit: 50, // Custom page size
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(customPageSizeEmpty);
  TestValidator.equals(
    "custom page size empty results count",
    customPageSizeEmpty.data.length,
    0,
  );
  TestValidator.equals(
    "custom page size empty records count",
    customPageSizeEmpty.pagination.records,
    0,
  );
  TestValidator.equals(
    "custom page size empty pages count",
    customPageSizeEmpty.pagination.pages,
    0,
  );
  TestValidator.equals(
    "custom page size empty limit",
    customPageSizeEmpty.pagination.limit,
    50,
  );
  // 8. Test edge case: high page number with empty results
  const highPageSearch =
    await api.functional.discussionBoard.superAdmin.search.index(
      superAdminConnection,
      {
        body: {
          search: "nonexistent",
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<100>>(), // High page number
          limit: 10,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(highPageSearch);
  // The system should handle high page numbers gracefully
  TestValidator.predicate(
    "high page search returns valid structure",
    highPageSearch.pagination.current >= 1,
  );
  // 9. Verify that searches with actual content work correctly (sanity check)
  const validSearch =
    await api.functional.discussionBoard.superAdmin.search.index(
      superAdminConnection,
      {
        body: {
          search: "programming", // Should match article1
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(validSearch);
  TestValidator.predicate(
    "valid search returns results",
    validSearch.data.length > 0,
  );
  TestValidator.predicate(
    "valid search has positive records",
    validSearch.pagination.records > 0,
  );
}
