import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerAccessLogs } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerAccessLogs";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAccessLogs } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAccessLogs";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_seller_access_logs_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin user
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: RandomGenerator.alphabets(8) + "@example.com",
      password: "test1234!@#",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Test access logs retrieval with pagination using admin connection
  // Note: Since we don't have seller creation functionality, we'll test with a dummy seller ID
  const response =
    await api.functional.shoppingMall.admin.sellers.access_logs.index(
      adminConnection,
      {
        sellerId: "00000000-0000-0000-0000-000000000000",
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallSellerAccessLogs.IRequest,
      },
    );
  typia.assert(response);
  // 3. Validate response structure
  TestValidator.equals("pagination exists", response.pagination.current, 1);
  TestValidator.equals("pagination limit", response.pagination.limit, 10);
  TestValidator.predicate("data is array", Array.isArray(response.data));
  // 4. Test filtering by success status
  const successResponse =
    await api.functional.shoppingMall.admin.sellers.access_logs.index(
      adminConnection,
      {
        sellerId: "00000000-0000-0000-0000-000000000000",
        body: {
          success: true,
          page: 1,
          limit: 10,
        } satisfies IShoppingMallSellerAccessLogs.IRequest,
      },
    );
  typia.assert(successResponse);
  // 5. Test filtering by IP address
  const ipResponse =
    await api.functional.shoppingMall.admin.sellers.access_logs.index(
      adminConnection,
      {
        sellerId: "00000000-0000-0000-0000-000000000000",
        body: {
          ip: "192.168",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallSellerAccessLogs.IRequest,
      },
    );
  typia.assert(ipResponse);
  // 6. Test date range filtering
  const today = new Date();
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const dateRangeResponse =
    await api.functional.shoppingMall.admin.sellers.access_logs.index(
      adminConnection,
      {
        sellerId: "00000000-0000-0000-0000-000000000000",
        body: {
          created_at_from: yesterday.toISOString(),
          created_at_to: today.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IShoppingMallSellerAccessLogs.IRequest,
      },
    );
  typia.assert(dateRangeResponse);
  // 7. Test sorting by date
  const sortedResponse =
    await api.functional.shoppingMall.admin.sellers.access_logs.index(
      adminConnection,
      {
        sellerId: "00000000-0000-0000-0000-000000000000",
        body: {
          sort: "-created_at",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallSellerAccessLogs.IRequest,
      },
    );
  typia.assert(sortedResponse);
  // 8. Validate access log structure when data exists
  if (response.data.length > 0) {
    const firstLog = response.data[0];
    TestValidator.predicate(
      "seller ID exists",
      firstLog.seller !== null && firstLog.seller !== undefined,
    );
    TestValidator.predicate(
      "IP format",
      /^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$/.test(firstLog.ip),
    );
    TestValidator.predicate(
      "success is boolean",
      typeof firstLog.success === "boolean",
    );
    TestValidator.predicate(
      "has valid timestamp",
      !isNaN(new Date(firstLog.createdAt).getTime()),
    );
  }
  // 9. Test pagination limits
  const limitResponse =
    await api.functional.shoppingMall.admin.sellers.access_logs.index(
      adminConnection,
      {
        sellerId: "00000000-0000-0000-0000-000000000000",
        body: {
          page: 1,
          limit: 100,
        } satisfies IShoppingMallSellerAccessLogs.IRequest,
      },
    );
  typia.assert(limitResponse);
  TestValidator.predicate(
    "limit respects maximum",
    limitResponse.pagination.limit <= 100,
  );
}
