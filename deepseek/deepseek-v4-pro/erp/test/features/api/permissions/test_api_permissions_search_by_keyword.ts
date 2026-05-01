import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmPermission";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmPermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test permissions search endpoint with keyword filtering and empty result handling.
 *
 * Validates that the PATCH /erpHrm/permissions endpoint correctly filters the nine built-in system permissions using the `search` request body parameter. The search must perform case-insensitive matching against both the dot-notation `key` field (e.g., "time:manage") and the human-readable `description` field.
 *
 * The test first searches for the keyword "time" and confirms that exactly three permissions containing "time" in their key or description are returned: time:manage, time:approve, and time:view_all. It then verifies that each result actually contains the search term, and that non-matching permissions (e.g., org:manage, project:view) are excluded from the response.
 *
 * A second search with a deliberately non-matching keyword verifies the edge case where zero results match, confirming that an empty data array is returned along with correct pagination metadata where records equals 0.
 *
 * 1. Search with keyword "time" — verify three time-related permissions returned.
 * 2. Validate each returned permission contains "time" in its key or description.
 * 3. Search with non-matching keyword — verify empty data array and records=0.
 */
export async function test_api_permissions_search_by_keyword(
  connection: api.IConnection,
): Promise<void> {
  // 1. Search with keyword "time"
  const timeResults = await api.functional.erpHrm.permissions.index(
    connection,
    {
      body: { search: "time" } satisfies IErpHrmPermission.IRequest,
    },
  );
  typia.assert(timeResults);
  TestValidator.equals("time search result count", timeResults.data.length, 3);
  // 2. Validate each returned permission contains "time" in key or description
  for (const perm of timeResults.data) {
    TestValidator.predicate(
      `permission "${perm.key}" contains search term "time"`,
      perm.key.toLowerCase().includes("time") ||
        perm.description.toLowerCase().includes("time"),
    );
  }
  // 3. Search with non-matching keyword
  const noResults = await api.functional.erpHrm.permissions.index(connection, {
    body: {
      search: "zzz_nonexistent_keyword_xyz",
    } satisfies IErpHrmPermission.IRequest,
  });
  typia.assert(noResults);
  TestValidator.equals("empty data array", noResults.data.length, 0);
  TestValidator.equals("records is 0", noResults.pagination.records, 0);
}
