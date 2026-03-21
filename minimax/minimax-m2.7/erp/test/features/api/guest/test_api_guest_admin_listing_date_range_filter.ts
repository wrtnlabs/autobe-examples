import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuest";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_guest_admin_listing_date_range_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Get all guests first to establish baseline and capture date range
  const allGuestsResult = await api.functional.erpHrm.admin.guests.index(
    adminConnection,
    {
      body: {} satisfies IErpHrmGuest.IRequest,
    },
  );
  typia.assert(allGuestsResult);
  // If no guests exist, create test data by registering admins (which creates sessions)
  if (allGuestsResult.data.length === 0) {
    // Create some test admins to generate activity
    const testConnections: api.IConnection[] = [];
    for (let i = 0; i < 3; i++) {
      const testConn: api.IConnection = { host: connection.host };
      await authorize_admin_join(testConn, {});
      testConnections.push(testConn);
    }
    // Re-fetch guests after activity
    const refreshedResult = await api.functional.erpHrm.admin.guests.index(
      adminConnection,
      {
        body: {} satisfies IErpHrmGuest.IRequest,
      },
    );
    typia.assert(refreshedResult);
    if (refreshedResult.data.length === 0) {
      // Cannot test date range without any guest data
      return;
    }
    // Use refreshed data
    Object.assign(allGuestsResult, refreshedResult);
  }
  const guests = allGuestsResult.data;
  const totalRecords = allGuestsResult.pagination.records;
  // 3. Test basic date range filtering
  // Pick dates that should include some guests
  const guestDates = guests.map((g) => new Date(g.created_at).getTime());
  const minDate = new Date(Math.min(...guestDates));
  const maxDate = new Date(Math.max(...guestDates));
  // Create a narrow date range in the middle
  const midDate = new Date((minDate.getTime() + maxDate.getTime()) / 2);
  const rangeStart = new Date(minDate.getTime() - 86400000); // 1 day before oldest
  const rangeEnd = new Date(midDate.getTime() + 86400000); // 1 day after mid
  const rangeResult = await api.functional.erpHrm.admin.guests.index(
    adminConnection,
    {
      body: {
        created_at_gte: rangeStart.toISOString(),
        created_at_lte: rangeEnd.toISOString(),
      } satisfies IErpHrmGuest.IRequest,
    },
  );
  typia.assert(rangeResult);
  // All returned guests should be within the date range
  for (const guest of rangeResult.data) {
    const guestTime = new Date(guest.created_at).getTime();
    TestValidator.predicate(
      "guest created_at within range",
      guestTime >= rangeStart.getTime() && guestTime <= rangeEnd.getTime(),
    );
  }
  // 4. Test combining date range with pagination
  const pageLimit = 2;
  const paginatedResult = await api.functional.erpHrm.admin.guests.index(
    adminConnection,
    {
      body: {
        created_at_gte: rangeStart.toISOString(),
        created_at_lte: rangeEnd.toISOString(),
        page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
        limit: pageLimit,
      } satisfies IErpHrmGuest.IRequest,
    },
  );
  typia.assert(paginatedResult);
  TestValidator.equals(
    "limit matches requested",
    paginatedResult.pagination.limit,
    pageLimit,
  );
  TestValidator.predicate(
    "data count <= limit",
    paginatedResult.data.length <= pageLimit,
  );
  // 5. Test combining date range with only_deleted filter
  const deletedResult = await api.functional.erpHrm.admin.guests.index(
    adminConnection,
    {
      body: {
        created_at_gte: rangeStart.toISOString(),
        created_at_lte: rangeEnd.toISOString(),
        only_deleted: true,
      } satisfies IErpHrmGuest.IRequest,
    },
  );
  typia.assert(deletedResult);
  // 6. Test only_created_at_gte filter
  const gteOnlyResult = await api.functional.erpHrm.admin.guests.index(
    adminConnection,
    {
      body: {
        created_at_gte: minDate.toISOString(),
      } satisfies IErpHrmGuest.IRequest,
    },
  );
  typia.assert(gteOnlyResult);
  for (const guest of gteOnlyResult.data) {
    const guestTime = new Date(guest.created_at).getTime();
    TestValidator.predicate(
      "guest created_at >= gte filter",
      guestTime >= minDate.getTime(),
    );
  }
  // 7. Test only created_at_lte filter
  const lteOnlyResult = await api.functional.erpHrm.admin.guests.index(
    adminConnection,
    {
      body: {
        created_at_lte: maxDate.toISOString(),
      } satisfies IErpHrmGuest.IRequest,
    },
  );
  typia.assert(lteOnlyResult);
  for (const guest of lteOnlyResult.data) {
    const guestTime = new Date(guest.created_at).getTime();
    TestValidator.predicate(
      "guest created_at <= lte filter",
      guestTime <= maxDate.getTime(),
    );
  }
  // 8. Test date range with page and only_deleted combined
  const combinedResult = await api.functional.erpHrm.admin.guests.index(
    adminConnection,
    {
      body: {
        created_at_gte: rangeStart.toISOString(),
        created_at_lte: rangeEnd.toISOString(),
        page: 1,
        limit: pageLimit,
        only_deleted: false,
      } satisfies IErpHrmGuest.IRequest,
    },
  );
  typia.assert(combinedResult);
  TestValidator.equals(
    "combined limit",
    combinedResult.pagination.limit,
    pageLimit,
  );
  TestValidator.predicate(
    "combined data count valid",
    combinedResult.data.length <= pageLimit,
  );
}
