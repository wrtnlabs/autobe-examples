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
 * Tests the member listing endpoint correctly filters members by email address, display name, and phone number with proper pagination.
 *
 * Validates the public member search functionality including response format compliance, filter parameter acceptance, and pagination metadata accuracy. Tests filtering by email (partial match), display name (partial match), and phone number (prefix match) with proper return structure.
 *
 * The endpoint is public and does not require authentication. Each filter test verifies the response structure remains valid regardless of filter criteria applied. Pagination parameters are tested to ensure proper record limiting and page tracking.
 *
 * 1. Test member listing with no filters - validates base response structure with default pagination.
 * 2. Test email filter - validates response structure when filtering by email substring.
 * 3. Test display name filter - validates response structure when filtering by display name substring.
 * 4. Test phone number filter - validates response structure when filtering by phone number prefix.
 * 5. Test pagination parameters - validates page and limit parameter handling.
 */
export async function test_api_member_search_by_filters(
  connection: api.IConnection,
): Promise<void> {
  // Create dedicated connection for this test
  const publicConnection: api.IConnection = { host: connection.host };
  // 1. Test member listing with no filters - validates base response structure
  const emptyBody = {} satisfies IHrmPlatformMember.IRequest;
  const searchEmpty = await api.functional.hrmPlatform.members.index(
    publicConnection,
    { body: emptyBody },
  );
  typia.assert(searchEmpty);
  TestValidator.equals(
    "empty filter pagination current is 1",
    searchEmpty.pagination.current,
    1,
  );
  TestValidator.predicate(
    "empty filter pagination records non-negative",
    searchEmpty.pagination.records >= 0,
  );
  TestValidator.equals(
    "empty filter default limit is 100",
    searchEmpty.pagination.limit,
    100,
  );
  // 2. Test email filter - validates case-insensitive partial match acceptance
  const emailFilter = "xyzfilter99";
  const emailBody = {
    email: emailFilter,
  } satisfies IHrmPlatformMember.IRequest;
  const searchEmail = await api.functional.hrmPlatform.members.index(
    publicConnection,
    { body: emailBody },
  );
  typia.assert(searchEmail);
  TestValidator.equals(
    "email filter response has valid pagination",
    searchEmail.pagination.current,
    1,
  );
  TestValidator.predicate(
    "email filter response has records count",
    searchEmail.pagination.records >= 0,
  );
  // 3. Test display name filter - validates partial match acceptance
  const displayNameFilter = "zzzname777";
  const displayNameBody = {
    displayName: displayNameFilter,
  } satisfies IHrmPlatformMember.IRequest;
  const searchDisplayName = await api.functional.hrmPlatform.members.index(
    publicConnection,
    { body: displayNameBody },
  );
  typia.assert(searchDisplayName);
  TestValidator.equals(
    "display name filter response has valid pagination",
    searchDisplayName.pagination.current,
    1,
  );
  TestValidator.predicate(
    "display name filter response has valid pages",
    searchDisplayName.pagination.pages >= 0,
  );
  // 4. Test phone number filter - validates prefix match acceptance
  const phoneFilter = "+999";
  const phoneBody = {
    phoneNumber: phoneFilter,
  } satisfies IHrmPlatformMember.IRequest;
  const searchPhone = await api.functional.hrmPlatform.members.index(
    publicConnection,
    { body: phoneBody },
  );
  typia.assert(searchPhone);
  TestValidator.equals(
    "phone filter response has valid pagination",
    searchPhone.pagination.current,
    1,
  );
  TestValidator.predicate(
    "phone filter response has valid data array",
    Array.isArray(searchPhone.data),
  );
  // 5. Test pagination parameters - validates page and limit handling
  const pageBody = {
    page: 1,
    limit: 5,
  } satisfies IHrmPlatformMember.IRequest;
  const searchPaginated = await api.functional.hrmPlatform.members.index(
    publicConnection,
    { body: pageBody },
  );
  typia.assert(searchPaginated);
  TestValidator.equals(
    "pagination current page matches request",
    searchPaginated.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    searchPaginated.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "pagination data array respects limit",
    searchPaginated.data.length <= 5,
  );
}
