import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberWarning } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberWarning";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformMemberWarning } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMemberWarning";

/**
 * Test behavior when warning search returns no results.
 *
 * Validates that the member warning search API correctly handles empty result
 * sets by returning proper pagination information with zero records and an
 * empty data array.
 *
 * Test process:
 *
 * 1. Create administrator account for accessing member warning search
 * 2. Search with filters that guarantee no matching records (non-existent member
 *    ID)
 * 3. Validate response maintains correct structure with empty data array
 * 4. Confirm pagination reflects zero records and zero pages
 */
export async function test_api_member_warnings_empty_result_set(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphabets(12),
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: null,
        ip: null,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(administrator);
  TestValidator.predicate(
    "administrator account created",
    administrator.id !== null && administrator.id !== undefined,
  );

  // Step 2: Search for member warnings with non-existent member ID
  // Using a random UUID that doesn't exist to guarantee empty results
  const nonExistentMemberId = typia.random<string & tags.Format<"uuid">>();

  const searchRequest = {
    page: 1,
    limit: 20,
    memberId: nonExistentMemberId,
  } satisfies ICommunityPlatformMemberWarning.IRequest;

  const result =
    await api.functional.communityPlatform.administrator.memberWarnings.index(
      connection,
      {
        body: searchRequest,
      },
    );
  typia.assert(result);

  // Step 3: Validate response structure
  TestValidator.predicate(
    "response has pagination object",
    result.pagination !== null && result.pagination !== undefined,
  );
  TestValidator.predicate(
    "response has data array",
    Array.isArray(result.data),
  );

  // Step 4: Validate empty result set
  TestValidator.equals("data array is empty", result.data.length, 0);
  TestValidator.equals(
    "pagination total records is zero",
    result.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination total pages is zero",
    result.pagination.pages,
    0,
  );
  TestValidator.equals(
    "pagination current page matches request",
    result.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    result.pagination.limit,
    20,
  );

  // Step 5: Test with future date range to ensure no results
  const futureDate = new Date();
  futureDate.setFullYear(futureDate.getFullYear() + 1);

  const futureDateRequest = {
    page: 1,
    limit: 10,
    createdDateFrom: futureDate.toISOString(),
    createdDateTo: futureDate.toISOString(),
  } satisfies ICommunityPlatformMemberWarning.IRequest;

  const futureResult =
    await api.functional.communityPlatform.administrator.memberWarnings.index(
      connection,
      {
        body: futureDateRequest,
      },
    );
  typia.assert(futureResult);

  TestValidator.equals(
    "future date range returns empty data array",
    futureResult.data.length,
    0,
  );
  TestValidator.equals(
    "future date range has zero total records",
    futureResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "future date range has zero total pages",
    futureResult.pagination.pages,
    0,
  );
}
