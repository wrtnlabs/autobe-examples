import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_order_snapshots_admin_filter_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register administrator account
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminJoinConnection, {
    body: {
      display_name: RandomGenerator.name(2),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular" as const,
    },
  });
  typia.assert(admin);
  // 2. Create admin connection with token
  const adminConnection: api.IConnection = { host: connection.host };
  adminConnection.headers = {
    Authorization: admin.token.access,
  };
  // 3. Create mock order ID for testing snapshot endpoint
  const mockOrderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Generate test timestamps for date range filtering
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const twoHoursAgo = new Date(now.getTime() - 120 * 60 * 1000);
  const threeHoursAgo = new Date(now.getTime() - 180 * 60 * 1000);
  // 5. Test filtering with both order_date_start and order_date_end
  const filterWithBothDates: IEcommerceMallOrderSnapshot.IRequest = {
    page: 1,
    limit: 20,
    order_date_start: oneHourAgo.toISOString(),
    order_date_end: now.toISOString(),
  };
  const resultWithBothDates =
    await api.functional.ecommerceMall.administrator.orders.snapshots.index(
      adminConnection,
      {
        orderId: mockOrderId,
        body: filterWithBothDates,
      },
    );
  typia.assert(resultWithBothDates);
  TestValidator.equals(
    "pagination records with date filter",
    resultWithBothDates.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages with date filter",
    resultWithBothDates.pagination.pages,
    0,
  );
  // 6. Test filtering with only order_date_start (snapshots on or after)
  const filterWithStartDate: IEcommerceMallOrderSnapshot.IRequest = {
    page: 1,
    limit: 20,
    order_date_start: twoHoursAgo.toISOString(),
  };
  const resultWithStartDate =
    await api.functional.ecommerceMall.administrator.orders.snapshots.index(
      adminConnection,
      {
        orderId: mockOrderId,
        body: filterWithStartDate,
      },
    );
  typia.assert(resultWithStartDate);
  TestValidator.equals(
    "pagination records with start date filter",
    resultWithStartDate.pagination.records,
    0,
  );
  // 7. Test filtering with only order_date_end (snapshots on or before)
  const filterWithEndDate: IEcommerceMallOrderSnapshot.IRequest = {
    page: 1,
    limit: 20,
    order_date_end: threeHoursAgo.toISOString(),
  };
  const resultWithEndDate =
    await api.functional.ecommerceMall.administrator.orders.snapshots.index(
      adminConnection,
      {
        orderId: mockOrderId,
        body: filterWithEndDate,
      },
    );
  typia.assert(resultWithEndDate);
  TestValidator.equals(
    "pagination records with end date filter",
    resultWithEndDate.pagination.records,
    0,
  );
  // 8. Test empty results scenario with no matching snapshots
  const filterWithNoResults: IEcommerceMallOrderSnapshot.IRequest = {
    page: 1,
    limit: 20,
    order_date_start: now.toISOString(),
    order_date_end: now.toISOString(),
  };
  const resultNoResults =
    await api.functional.ecommerceMall.administrator.orders.snapshots.index(
      adminConnection,
      {
        orderId: mockOrderId,
        body: filterWithNoResults,
      },
    );
  typia.assert(resultNoResults);
  TestValidator.equals(
    "empty result records",
    resultNoResults.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result pages",
    resultNoResults.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty result data length",
    resultNoResults.data.length,
    0,
  );
  // 9. Test pagination with date filter - verify limit parameter still works
  const filterWithLimit: IEcommerceMallOrderSnapshot.IRequest = {
    page: 1,
    limit: 5,
    order_date_start: twoHoursAgo.toISOString(),
    order_date_end: now.toISOString(),
  };
  const resultWithLimit =
    await api.functional.ecommerceMall.administrator.orders.snapshots.index(
      adminConnection,
      {
        orderId: mockOrderId,
        body: filterWithLimit,
      },
    );
  typia.assert(resultWithLimit);
  TestValidator.equals(
    "pagination records with limit filter",
    resultWithLimit.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination limit with filter",
    resultWithLimit.pagination.limit,
    5,
  );
}
