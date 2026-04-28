import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test member listing endpoint returns all registered member accounts with no filters.
 *
 * Validates the member listing happy path by sending an empty request body to PATCH /hrmPlatform/members. Verifies that the response contains valid pagination metadata and member summary records ordered by creation date.
 *
 * This is a public endpoint that does not require authentication. The test confirms the API returns properly structured paginated responses with essential member profile information while excluding sensitive authentication data.
 *
 * 1. Send PATCH request to /hrmPlatform/members with empty body (no filters).
 * 2. Validate response structure and pagination metadata (current, limit, records, pages).
 * 3. Verify pages calculation matches Math.ceil(records / limit).
 * 4. Verify data array contains member summary records with expected fields.
 * 5. If multiple results returned, verify ordering by created_at descending.
 */
export async function test_api_member_list_all_members(
  connection: api.IConnection,
): Promise<void> {
  // 1. Prepare empty request body (no filters - all fields optional)
  const body = {} satisfies IHrmPlatformMember.IRequest;
  // 2. Call public member listing endpoint
  const response = await api.functional.hrmPlatform.members.index(connection, {
    body,
  });
  // 3. Assert response type (validates structure: pagination + data array)
  typia.assert(response);
  // 4. Validate pagination metadata has sensible values
  TestValidator.predicate(
    "current page is at least 1",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit is at least 1",
    response.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "records count is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    response.pagination.pages >= 0,
  );
  // 5. Validate pages calculation: Math.ceil(records / limit), with 0 when no records
  const expectedPages =
    response.pagination.records === 0
      ? 0
      : Math.ceil(response.pagination.records / response.pagination.limit);
  TestValidator.equals(
    "pages equals ceil(records / limit)",
    response.pagination.pages,
    expectedPages,
  );
  // 6. Validate data array length matches pagination expectation (first page)
  const expectedFirstPageCount = Math.min(
    response.pagination.limit,
    response.pagination.records,
  );
  TestValidator.equals(
    "first page data length matches expected",
    response.data.length,
    expectedFirstPageCount,
  );
  // 7. If multiple results, verify ordering by created_at descending
  if (response.data.length >= 2) {
    for (let i = 0; i < response.data.length - 1; i++) {
      const currentTimestamp = new Date(response.data[i].created_at).getTime();
      const nextTimestamp = new Date(response.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        `record ${i} created_at >= record ${i + 1} created_at`,
        currentTimestamp >= nextTimestamp,
      );
    }
  }
  // 8. Verify first member summary has expected properties (typia.assert already validates types)
  if (response.data.length > 0) {
    const member = response.data[0];
    TestValidator.predicate(
      "member id is valid UUID format",
      member.id.length === 36,
    );
    TestValidator.predicate("member has email", member.email.length > 0);
    TestValidator.predicate(
      "member has display name",
      member.display_name.length > 0,
    );
    TestValidator.predicate(
      "member has created_at date-time",
      member.created_at.length > 0,
    );
  }
}
