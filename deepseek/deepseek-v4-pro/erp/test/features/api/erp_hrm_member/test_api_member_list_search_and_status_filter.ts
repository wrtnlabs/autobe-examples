import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test combined display name search and status filter with AND logic.
 *
 * Validates that the member listing endpoint correctly applies AND-combined
 * filtering when both the fuzzy display name search and the employee status
 * filter are provided simultaneously. The search uses trigram-based fuzzy
 * matching on the display_name column, while the status filter performs an
 * exact equality match on the employee status column.
 *
 * Special attention is given to verifying that the AND logic is correctly
 * enforced — no deactivated members appear when status is filtered to
 * 'active', pagination metadata reflects the filtered result set rather
 * than the full member count, and the empty-result edge case returns
 * accurate pagination with zero records and pages.
 *
 * 1. Fetches all active members to obtain a known display name for
 *    substring extraction.
 * 2. Extracts a random substring from a known member's display name to
 *    serve as the fuzzy search term.
 * 3. Queries the API with both the extracted search term and
 *    status='active' combined via AND logic.
 * 4. Validates that every returned member has status 'active', confirming
 *    deactivated employees are excluded.
 * 5. Validates pagination metadata accurately reflects the filtered result
 *    count.
 * 6. Tests the empty-result edge case by searching with a guaranteed
 *    non-matching term combined with status='active', verifying an empty
 *    data array and zero-valued pagination metadata.
 */
export async function test_api_member_list_search_and_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Get all active members to find a display name for substring extraction
  const allActive = await api.functional.erpHrm.members.index(connection, {
    body: {
      status: "active",
      limit: 100,
      sort: "display_name:asc",
    } satisfies IErpHrmMember.IRequest,
  });
  typia.assert(allActive);
  // 2. Extract a random substring from a known member's display name
  //    to use as the fuzzy search term (simulates 'jon' matching 'Jonathan')
  const searchTerm =
    allActive.data.length > 0
      ? RandomGenerator.substring(allActive.data[0].display_name)
      : "a";
  // 3. Search with substring + status='active' combined via AND logic
  const result = await api.functional.erpHrm.members.index(connection, {
    body: {
      search: searchTerm,
      status: "active",
      limit: 100,
    } satisfies IErpHrmMember.IRequest,
  });
  typia.assert(result);
  // 4. Validate all returned members have 'active' status
  //    — no deactivated members should appear in results
  for (const member of result.data) {
    TestValidator.equals(
      "member status should be active",
      member.status,
      "active",
    );
  }
  // 5. Validate pagination metadata reflects filtered result set
  TestValidator.predicate(
    "pagination records >= data length",
    result.pagination.records >= result.data.length,
  );
  TestValidator.predicate(
    "filtered records <= total active records",
    result.pagination.records <= allActive.pagination.records,
  );
  // 6. Test empty-result edge case: no members match both criteria
  const noMatchResult = await api.functional.erpHrm.members.index(connection, {
    body: {
      search: "xyznonexistingterm999",
      status: "active",
    } satisfies IErpHrmMember.IRequest,
  });
  typia.assert(noMatchResult);
  TestValidator.equals(
    "no match — data array should be empty",
    noMatchResult.data.length,
    0,
  );
  TestValidator.equals(
    "no match — pagination records should be 0",
    noMatchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "no match — pagination pages should be 0",
    noMatchResult.pagination.pages,
    0,
  );
}
