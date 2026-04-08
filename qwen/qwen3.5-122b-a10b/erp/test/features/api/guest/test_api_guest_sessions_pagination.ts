import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmGuest";
import type { IHrmGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmGuestSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_sessions_pagination(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test retrieving guest session records with pagination.
   *
   * Validates the paginated listing of guest session records by creating multiple
   * guest accounts and verifying the pagination metadata and data structure.
   *
   * 1. Create multiple guest accounts via /hrm/auth/guest/join to generate session records
   * 2. Call the index endpoint with pagination parameters (page and limit)
   * 3. Verify pagination metadata (current page, limit, total records, total pages)
   * 4. Verify data array contains guest session summaries with expected fields
   * 5. Test pagination respects the limit parameter
   * 6. Test empty result set returns empty array with valid pagination metadata
   * 7. Test default pagination uses limit=20 when not specified
   */
  // Create multiple guest accounts to generate session records
  const guestCount = 25;
  for (let i = 0; i < guestCount; i++) {
    const guestConnection: api.IConnection = { host: connection.host };
    const guestAuth = await authorize_guest_join(guestConnection, {
      body: {
        device_fingerprint: RandomGenerator.alphaNumeric(32),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IHrmGuest.IJoin,
    });
    typia.assert(guestAuth);
  }
  // Test 1: Pagination with custom limit
  const customLimit = 10;
  const page1 = await api.functional.hrm.guest.guest.sessions.index(
    connection,
    {
      body: {
        page: 1,
        limit: customLimit,
      } satisfies IHrmGuestSession.IRequest,
    },
  );
  typia.assert(page1);
  TestValidator.equals("pagination current page", page1.pagination.current, 1);
  TestValidator.equals("pagination limit", page1.pagination.limit, customLimit);
  TestValidator.predicate(
    "pagination records exists",
    page1.pagination.records > 0,
  );
  TestValidator.predicate(
    "pagination pages calculated correctly",
    page1.pagination.pages ===
      Math.ceil(page1.pagination.records / customLimit),
  );
  TestValidator.predicate(
    "data array respects limit",
    page1.data.length <= customLimit,
  );
  // Test 2: Test pagination across multiple pages
  if (page1.pagination.records > customLimit) {
    const page2 = await api.functional.hrm.guest.guest.sessions.index(
      connection,
      {
        body: {
          page: 2,
          limit: customLimit,
        } satisfies IHrmGuestSession.IRequest,
      },
    );
    typia.assert(page2);
    TestValidator.equals(
      "pagination current page is 2",
      page2.pagination.current,
      2,
    );
    TestValidator.predicate(
      "page 2 data length respects limit",
      page2.data.length <= customLimit,
    );
    TestValidator.notEquals(
      "page 2 has different records than page 1",
      page1.data.map((s) => s.id).join(","),
      page2.data.map((s) => s.id).join(","),
    );
  }
  // Test 3: Empty result set with non-existent filter
  const emptyResult = await api.functional.hrm.guest.guest.sessions.index(
    connection,
    {
      body: {
        device_fingerprint: "non-existent-fingerprint-12345",
        page: 1,
        limit: 20,
      } satisfies IHrmGuestSession.IRequest,
    },
  );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty result pagination current",
    emptyResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty result pagination limit",
    emptyResult.pagination.limit,
    20,
  );
  TestValidator.equals(
    "empty result pagination records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result pagination pages",
    emptyResult.pagination.pages,
    0,
  );
  TestValidator.equals("empty result data array", emptyResult.data.length, 0);
  // Test 4: Default pagination (no limit specified, should use 20)
  const defaultPagination = await api.functional.hrm.guest.guest.sessions.index(
    connection,
    {
      body: {
        page: 1,
      } satisfies IHrmGuestSession.IRequest,
    },
  );
  typia.assert(defaultPagination);
  TestValidator.predicate(
    "default pagination limit is 20",
    defaultPagination.pagination.limit === 20,
  );
  TestValidator.equals(
    "default pagination current page",
    defaultPagination.pagination.current,
    1,
  );
}
