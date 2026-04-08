import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallGuest";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test filtering guest accounts by device fingerprint for security monitoring purposes.
 *
 * Validates the guest account search functionality using device fingerprint filtering. The admin authenticates, then searches for guests using a partial device fingerprint match. Tests case-insensitive partial matching on the device_fingerprint field and verifies that only guests matching the fingerprint pattern are returned. Also tests the edge case where no guests match the search term, expecting an empty data array with records count of 0. Confirms pagination metadata is correctly calculated even with filtered results.
 *
 * 1. Administrator authenticates using join operation.
 * 2. Query all guests without filter to get baseline data.
 * 3. Search with partial device fingerprint string from existing guest.
 * 4. Validate search results match expected filtering behavior.
 * 5. Test edge case with non-matching search term.
 * 6. Verify pagination metadata accuracy.
 */
export async function test_api_guest_filter_by_device_fingerprint(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: RandomGenerator.pick(["regular", "super"] as const),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Get baseline - query all active guests
  const allGuests = await api.functional.shoppingMall.admin.guests.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 100,
        deleted: false,
      } satisfies IShoppingMallGuest.IRequest,
    },
  );
  typia.assert(allGuests);
  // 3. Test partial fingerprint search if guests exist
  if (allGuests.data.length > 0) {
    const sampleGuest = allGuests.data[0];
    const partialFingerprint = sampleGuest.device_fingerprint.substring(0, 8);
    const searchResults = await api.functional.shoppingMall.admin.guests.index(
      adminConnection,
      {
        body: {
          search: partialFingerprint,
          page: 1,
          limit: 100,
          deleted: false,
        } satisfies IShoppingMallGuest.IRequest,
      },
    );
    typia.assert(searchResults);
    // Validate all returned guests match the search pattern
    TestValidator.predicate("all results match fingerprint pattern", () =>
      searchResults.data.every((guest) =>
        guest.device_fingerprint
          .toLowerCase()
          .includes(partialFingerprint.toLowerCase()),
      ),
    );
    // Validate records count matches data length
    TestValidator.equals(
      "records count matches data length",
      searchResults.pagination.records,
      searchResults.data.length,
    );
    // Validate filtered results are subset of all guests
    TestValidator.predicate(
      "filtered results count <= total guests",
      () => searchResults.data.length <= allGuests.data.length,
    );
  }
  // 4. Test edge case - non-matching search term
  const uniqueSearchTerm = `nonexistent_${RandomGenerator.alphaNumeric(16)}`;
  const emptyResults = await api.functional.shoppingMall.admin.guests.index(
    adminConnection,
    {
      body: {
        search: uniqueSearchTerm,
        page: 1,
        limit: 100,
        deleted: false,
      } satisfies IShoppingMallGuest.IRequest,
    },
  );
  typia.assert(emptyResults);
  // Validate empty results
  TestValidator.equals("empty data array", emptyResults.data.length, 0);
  TestValidator.equals(
    "records count is 0",
    emptyResults.pagination.records,
    0,
  );
  TestValidator.equals("pages count is 0", emptyResults.pagination.pages, 0);
  TestValidator.equals("current page is 1", emptyResults.pagination.current, 1);
  // 5. Validate pagination metadata structure
  TestValidator.predicate(
    "pagination has valid limit",
    () => emptyResults.pagination.limit > 0,
  );
}
