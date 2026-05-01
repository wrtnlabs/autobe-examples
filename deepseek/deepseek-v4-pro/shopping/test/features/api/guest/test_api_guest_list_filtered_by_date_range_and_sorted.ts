import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallGuest";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test guest listing with date range filtering and custom sort order.
 *
 * Validates that the administrative guest listing endpoint correctly applies
 * date range filters on guest creation timestamps and respects the specified
 * sort direction. The test first retrieves all guests to establish a baseline,
 * then applies a created_at date range filter covering approximately half
 * the guests and overrides the default sort order to updated_at ascending.
 *
 * Verifications include that all returned guests have created_at within the
 * specified date range, results are correctly sorted by updated_at in ascending
 * order, and pagination metadata accurately reflects the filtered subset.
 *
 * 1. Administrator registers and authenticates via /auth/admin/join.
 * 2. Retrieves all active guests without filters to establish baseline data.
 * 3. Determines a date range covering roughly half the guests.
 * 4. Queries guests with created_at date range filter and updated_at_asc sort.
 * 5. Validates each returned guest falls within the date range.
 * 6. Validates ascending sort order on updated_at.
 * 7. Confirms pagination metadata consistency.
 */
export async function test_api_guest_list_filtered_by_date_range_and_sorted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, { body: typia.random<IShoppingMallAdmin.IJoin>() });
  // 2. Retrieve all guests to establish baseline
  const allGuests = await api.functional.shoppingMall.admin.guests.index(
    adminConnection,
    {
      body: {
        limit: 100,
        sort: "created_at_asc",
      } satisfies IShoppingMallGuest.IRequest,
    },
  );
  typia.assert(allGuests);
  TestValidator.predicate(
    "has guests for filtering test",
    allGuests.data.length >= 2,
  );
  // 3. Determine date range covering roughly half the guests
  const sortedByCreated = [...allGuests.data].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  const midpointIndex = Math.floor(sortedByCreated.length / 2);
  const created_at_from = sortedByCreated[0].created_at;
  const created_at_to = sortedByCreated[midpointIndex].created_at;
  // 4. Query with date range filter and updated_at_asc sort
  const filtered = await api.functional.shoppingMall.admin.guests.index(
    adminConnection,
    {
      body: {
        created_at_from,
        created_at_to,
        sort: "updated_at_asc",
        limit: 100,
      } satisfies IShoppingMallGuest.IRequest,
    },
  );
  typia.assert(filtered);
  // 5. Validate all returned guests are within the date range
  const fromTime = new Date(created_at_from).getTime();
  const toTime = new Date(created_at_to).getTime();
  for (const guest of filtered.data) {
    const createdTime = new Date(guest.created_at).getTime();
    TestValidator.predicate(
      "guest created within date range",
      createdTime >= fromTime && createdTime <= toTime,
    );
  }
  // 6. Validate ascending sort by updated_at
  for (let i = 1; i < filtered.data.length; i++) {
    const prevTime = new Date(filtered.data[i - 1].updated_at).getTime();
    const currTime = new Date(filtered.data[i].updated_at).getTime();
    TestValidator.predicate(
      "sorted by updated_at ascending",
      prevTime <= currTime,
    );
  }
  // 7. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    filtered.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination records count",
    filtered.pagination.records >= filtered.data.length,
  );
  TestValidator.equals(
    "pagination pages calculation",
    filtered.pagination.pages,
    Math.ceil(filtered.pagination.records / filtered.pagination.limit),
  );
}
