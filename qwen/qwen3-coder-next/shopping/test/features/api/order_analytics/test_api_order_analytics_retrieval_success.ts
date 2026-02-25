import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_order_analytics_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new admin user
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: "admin@example.com",
    password: "Admin@1234",
  } satisfies IShoppingMallAdmin.IJoin;
  await authorize_admin_join(adminConnection, {
    body: adminCredentials,
  });
  // 2. Call PATCH /shoppingMall/admin/analytics/orders without any filters
  const analyticsResponse =
    await api.functional.shoppingMall.admin.analytics.orders.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  // 3. Verify response structure and content
  typia.assert(analyticsResponse);
  // 4. Verify status_counts contains all required statuses
  const dataItem = analyticsResponse.data[0];
  if (dataItem) {
    // Verify main analytics fields exist
    TestValidator.predicate(
      "total_orders exists",
      typeof dataItem.total_orders === "number",
    );
    TestValidator.predicate(
      "total_revenue exists",
      typeof dataItem.total_revenue === "number",
    );
    TestValidator.predicate(
      "avg_order_value exists",
      typeof dataItem.avg_order_value === "number",
    );
    // Verify status_counts has all required status fields
    TestValidator.predicate(
      "status_counts.paid exists",
      typeof dataItem.status_counts.paid === "number",
    );
    TestValidator.predicate(
      "status_counts.shipped exists",
      typeof dataItem.status_counts.shipped === "number",
    );
    TestValidator.predicate(
      "status_counts.delivered exists",
      typeof dataItem.status_counts.delivered === "number",
    );
    TestValidator.predicate(
      "status_counts.cancelled exists",
      typeof dataItem.status_counts.cancelled === "number",
    );
    TestValidator.predicate(
      "status_counts.refunded exists",
      typeof dataItem.status_counts.refunded === "number",
    );
  }
  // 5. Verify pagination information is present with correct structure
  const pagination = analyticsResponse.pagination;
  TestValidator.equals("pagination exists", pagination !== undefined, true);
  if (pagination) {
    TestValidator.predicate("current page is valid", pagination.current >= 0);
    TestValidator.predicate("limit is valid", pagination.limit >= 0);
    TestValidator.predicate("records is valid", pagination.records >= 0);
    TestValidator.predicate("pages is valid", pagination.pages >= 0);
  }
}
