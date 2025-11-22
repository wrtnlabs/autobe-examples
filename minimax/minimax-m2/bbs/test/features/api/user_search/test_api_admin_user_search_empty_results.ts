import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalDiscussionSystemAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionSystemAdministrator";
import type { IEconPoliticalDiscussionUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconPoliticalDiscussionUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPoliticalDiscussionUser";

/**
 * Test user search behavior when no users match search criteria.
 *
 * Validates that the system returns appropriate empty results with correct
 * pagination metadata (zero records, zero pages) when search filters return no
 * matches. Tests various filter combinations that should yield empty results,
 * such as searching for non-existent usernames or filtering by status values
 * that don't exist. Ensures administrators receive meaningful feedback when
 * searches don't match any users rather than errors or malformed responses.
 */
export async function test_api_admin_user_search_empty_results(
  connection: api.IConnection,
) {
  // 1. Authenticate as system administrator
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IEconPoliticalDiscussionSystemAdministrator.IAuthorized =
    await api.functional.auth.systemAdministrator.join.create(connection, {
      body: {
        display_name: RandomGenerator.name(),
        email: adminEmail,
        status: "active",
      } satisfies IEconPoliticalDiscussionUser.ICreate,
    });
  typia.assert(admin);

  // 2. Test search with non-existent display name
  const nonexistentNameSearch =
    await api.functional.econPoliticalDiscussion.systemAdministrator.users.index(
      connection,
      {
        body: {
          search: "ThisUserNameDoesNotExistInTheSystem",
        } satisfies IEconPoliticalDiscussionUser.IRequest,
      },
    );
  typia.assert(nonexistentNameSearch);

  TestValidator.equals(
    "empty search results - no matching names",
    nonexistentNameSearch.data,
    [],
  );
  TestValidator.equals(
    "pagination metadata - zero records",
    nonexistentNameSearch.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination metadata - zero pages",
    nonexistentNameSearch.pagination.pages,
    0,
  );

  // 3. Test search with invalid status filter
  const invalidStatusSearch =
    await api.functional.econPoliticalDiscussion.systemAdministrator.users.index(
      connection,
      {
        body: {
          status: "nonExistentStatus",
        } satisfies IEconPoliticalDiscussionUser.IRequest,
      },
    );
  typia.assert(invalidStatusSearch);

  TestValidator.equals(
    "empty search results - invalid status",
    invalidStatusSearch.data,
    [],
  );
  TestValidator.equals(
    "pagination metadata - zero records for invalid status",
    invalidStatusSearch.pagination.records,
    0,
  );

  // 4. Test search with impossible combination (non-existent name + invalid status)
  const impossibleCombinationSearch =
    await api.functional.econPoliticalDiscussion.systemAdministrator.users.index(
      connection,
      {
        body: {
          search: "NonExistentUser123",
          status: "invalidStatusValue",
        } satisfies IEconPoliticalDiscussionUser.IRequest,
      },
    );
  typia.assert(impossibleCombinationSearch);

  TestValidator.equals(
    "empty search results - impossible combination",
    impossibleCombinationSearch.data,
    [],
  );
  TestValidator.equals(
    "pagination metadata - zero records for combination",
    impossibleCombinationSearch.pagination.records,
    0,
  );

  // 5. Test search with very specific search term that doesn't match
  const specificNonMatchSearch =
    await api.functional.econPoliticalDiscussion.systemAdministrator.users.index(
      connection,
      {
        body: {
          search: "zzzzzzz_nonexistent_very_specific_term_zzzzzzzz",
        } satisfies IEconPoliticalDiscussionUser.IRequest,
      },
    );
  typia.assert(specificNonMatchSearch);

  TestValidator.equals(
    "empty search results - specific non-matching term",
    specificNonMatchSearch.data,
    [],
  );
  TestValidator.equals(
    "pagination metadata - zero records for specific term",
    specificNonMatchSearch.pagination.records,
    0,
  );

  // 6. Test with pagination on empty results
  const paginatedEmptySearch =
    await api.functional.econPoliticalDiscussion.systemAdministrator.users.index(
      connection,
      {
        body: {
          search: "NoMatchUser",
          page: 5,
          limit: 10,
        } satisfies IEconPoliticalDiscussionUser.IRequest,
      },
    );
  typia.assert(paginatedEmptySearch);

  TestValidator.equals(
    "empty search results - paginated",
    paginatedEmptySearch.data,
    [],
  );
  TestValidator.equals(
    "pagination metadata - correct page number",
    paginatedEmptySearch.pagination.current,
    5,
  );
  TestValidator.equals(
    "pagination metadata - limit preserved",
    paginatedEmptySearch.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination metadata - zero records despite pagination",
    paginatedEmptySearch.pagination.records,
    0,
  );
}
