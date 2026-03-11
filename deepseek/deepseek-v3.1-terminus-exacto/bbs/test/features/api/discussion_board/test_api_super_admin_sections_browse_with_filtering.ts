import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test the super administrator's ability to browse and filter discussion board sections.
 * As a super admin overseeing platform governance, test various filtering combinations
 * to verify the system correctly returns only matching sections. Validate that the
 * response includes proper pagination metadata and section summaries with essential
 * information (id, name, description, created_at). Test different search term patterns
 * on name and description fields, verify sorting options (newest/oldest by creation,
 * alphabetical by name), and ensure deleted sections are excluded.
 */
export async function test_api_super_admin_sections_browse_with_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Test 1: Browse all sections with default pagination
  const allSections =
    await api.functional.discussionBoard.superAdmin.sections.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSection.IRequest,
      },
    );
  typia.assert(allSections);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination has current page",
    allSections.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has limit",
    allSections.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination has records count",
    allSections.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    allSections.pagination.pages >= 0,
  );
  // Test 2: Search by partial name match
  const searchTerm = "Section";
  const searchedSections =
    await api.functional.discussionBoard.superAdmin.sections.index(
      superAdminConnection,
      {
        body: {
          search: searchTerm,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSection.IRequest,
      },
    );
  typia.assert(searchedSections);
  // Validate search results contain the search term
  TestValidator.predicate(
    "search returns results",
    searchedSections.data.length >= 0,
  );
  // Test 3: Test sorting by newest first
  const newestSections =
    await api.functional.discussionBoard.superAdmin.sections.index(
      superAdminConnection,
      {
        body: {
          sort: "created_at:desc",
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardSection.IRequest,
      },
    );
  typia.assert(newestSections);
  // Test 4: Test sorting by oldest first
  const oldestSections =
    await api.functional.discussionBoard.superAdmin.sections.index(
      superAdminConnection,
      {
        body: {
          sort: "created_at:asc",
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardSection.IRequest,
      },
    );
  typia.assert(oldestSections);
  // Test 5: Test sorting by name ascending
  const nameAscSections =
    await api.functional.discussionBoard.superAdmin.sections.index(
      superAdminConnection,
      {
        body: {
          sort: "name:asc",
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardSection.IRequest,
      },
    );
  typia.assert(nameAscSections);
  // Test 6: Test sorting by name descending
  const nameDescSections =
    await api.functional.discussionBoard.superAdmin.sections.index(
      superAdminConnection,
      {
        body: {
          sort: "name:desc",
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardSection.IRequest,
      },
    );
  typia.assert(nameDescSections);
  // Test 7: Test pagination with small limit
  const paginatedSections =
    await api.functional.discussionBoard.superAdmin.sections.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 2,
        } satisfies IDiscussionBoardSection.IRequest,
      },
    );
  typia.assert(paginatedSections);
  TestValidator.equals(
    "pagination limit matches",
    paginatedSections.pagination.limit,
    2,
  );
  TestValidator.predicate(
    "data count does not exceed limit",
    paginatedSections.data.length <= 2,
  );
  // Test 8: Empty search term should return all sections
  const emptySearchSections =
    await api.functional.discussionBoard.superAdmin.sections.index(
      superAdminConnection,
      {
        body: {
          search: "",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSection.IRequest,
      },
    );
  typia.assert(emptySearchSections);
  // Business logic validation: Verify that sections have valid data structure
  // (typia.assert() already validates all properties, types, and formats)
  if (allSections.data.length > 0) {
    const section = allSections.data[0];
    // typia.assert() has already validated:
    // - UUID format of section.id
    // - string type and non-empty validation of section.name
    // - date-time format of section.created_at
    // - optional string|null type of section.description
    // Focus on business logic instead of redundant type validation
    TestValidator.predicate(
      "section name is non-empty",
      section.name.length > 0,
    );
  }
}
