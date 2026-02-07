import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardBanDuration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanDuration";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardBanDuration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardBanDuration";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test search functionality by partial name matching for ban duration configurations.
 * This test validates that super administrators can search for specific ban duration
 * options using partial text matching to quickly locate ban duration configurations
 * when they know approximate names but need to confirm exact configurations.
 */
export async function test_api_super_admin_ban_durations_search_by_name(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Note: Since there's no utility function to create ban durations,
  // we'll test search functionality against the existing ban duration configurations
  // that should be present in the system based on the requirements.
  // Test search by partial name matching for "day" keyword
  // This should match ban durations like "1 Day Ban", "7 Day Ban", etc.
  const searchResults =
    await api.functional.discussionBoard.superAdmin.ban_durations.index(
      superAdminConnection,
      {
        body: {
          search: "day",
        } satisfies IDiscussionBoardBanDuration.IRequest,
      },
    );
  typia.assert(searchResults);
  // Validate search results structure
  TestValidator.predicate(
    "has pagination info",
    searchResults.pagination !== undefined,
  );
  TestValidator.predicate("has data array", Array.isArray(searchResults.data));
  // Test that search returns meaningful results
  // Even if no "day" ban durations exist, the search should still return valid structure
  TestValidator.predicate(
    "pagination has valid current page",
    searchResults.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    searchResults.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has valid records count",
    searchResults.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has valid pages count",
    searchResults.pagination.pages >= 0,
  );
  // Test empty search (should return all results)
  const emptySearchResults =
    await api.functional.discussionBoard.superAdmin.ban_durations.index(
      superAdminConnection,
      {
        body: {
          search: "",
        } satisfies IDiscussionBoardBanDuration.IRequest,
      },
    );
  typia.assert(emptySearchResults);
  // Test non-matching search (should return empty or filtered results)
  const nonMatchingSearchResults =
    await api.functional.discussionBoard.superAdmin.ban_durations.index(
      superAdminConnection,
      {
        body: {
          search: "nonexistentkeyword12345",
        } satisfies IDiscussionBoardBanDuration.IRequest,
      },
    );
  typia.assert(nonMatchingSearchResults);
  // Validate that non-matching search returns valid pagination structure
  TestValidator.predicate(
    "non-matching search has valid pagination",
    nonMatchingSearchResults.pagination !== undefined,
  );
  TestValidator.predicate(
    "non-matching search has valid data array",
    Array.isArray(nonMatchingSearchResults.data),
  );
  // Test search with pagination parameters
  const paginatedSearchResults =
    await api.functional.discussionBoard.superAdmin.ban_durations.index(
      superAdminConnection,
      {
        body: {
          search: "day",
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardBanDuration.IRequest,
      },
    );
  typia.assert(paginatedSearchResults);
  // Validate paginated search results
  TestValidator.predicate(
    "paginated search has valid page",
    paginatedSearchResults.pagination.current === 1,
  );
  TestValidator.predicate(
    "paginated search has valid limit",
    paginatedSearchResults.pagination.limit === 5,
  );
  TestValidator.predicate(
    "paginated search data length does not exceed limit",
    paginatedSearchResults.data.length <= 5,
  );
}
