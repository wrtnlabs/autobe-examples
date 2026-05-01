import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityHubMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test member search with criteria producing empty result sets.
 *
 * Validates that the member search endpoint gracefully handles edge cases that produce no matching results. Rather than returning errors for contradictory or impossibly-specific filters, the endpoint must return an empty data array with accurate pagination metadata reflecting zero records and zero pages.
 *
 * The test covers two distinct empty-result scenarios:
 *
 * 1. Karma range where minimum exceeds maximum — the karma_min filter (100) is greater than karma_max (10), making it impossible for any member to satisfy both conditions simultaneously.
 * 2. Non-matching search string — a random search term that matches no existing username or display name in the system.
 *
 * For both scenarios, the test verifies that the response data array is empty and pagination metadata correctly reflects zero total records and zero total pages.
 */
export async function test_api_member_search_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. Test: karma_min > karma_max → empty results
  const result1 = await api.functional.communityHub.members.index(connection, {
    body: {
      karma_min: 100 as number & tags.Type<"int32">,
      karma_max: 10 as number & tags.Type<"int32">,
    } satisfies ICommunityHubMember.IRequest,
  });
  typia.assert(result1);
  TestValidator.equals("karma range - data empty", result1.data.length, 0);
  TestValidator.equals(
    "karma range - records zero",
    result1.pagination.records,
    0,
  );
  TestValidator.equals("karma range - pages zero", result1.pagination.pages, 0);
  // 2. Test: non-matching search string → empty results
  const result2 = await api.functional.communityHub.members.index(connection, {
    body: {
      search: "no_match_" + RandomGenerator.alphaNumeric(32),
    } satisfies ICommunityHubMember.IRequest,
  });
  typia.assert(result2);
  TestValidator.equals(
    "non-matching search - data empty",
    result2.data.length,
    0,
  );
  TestValidator.equals(
    "non-matching search - records zero",
    result2.pagination.records,
    0,
  );
  TestValidator.equals(
    "non-matching search - pages zero",
    result2.pagination.pages,
    0,
  );
}
