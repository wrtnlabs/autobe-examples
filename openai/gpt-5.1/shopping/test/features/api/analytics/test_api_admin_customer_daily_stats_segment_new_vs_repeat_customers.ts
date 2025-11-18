import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerDailyStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerDailyStat";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfig";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerDailyStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerDailyStat";

export async function test_api_admin_customer_daily_stats_segment_new_vs_repeat_customers(
  connection: api.IConnection,
) {
  // 1. Admin joins to obtain an authorized admin context
  const adminJoinInput = typia.random<IShoppingMallAdminJoin.ICreate>();
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinInput,
    });
  typia.assert(adminAuthorized);

  // 2. Seed a minimal but valid global configuration entry
  const configCreateBody = typia.random<IShoppingMallConfig.ICreate>();
  const createdConfig: IShoppingMallConfig =
    await api.functional.shoppingMall.admin.configs.create(connection, {
      body: configCreateBody,
    });
  typia.assert(createdConfig);

  // Helper to build a reasonable stats date window: from 30 days ago to now
  const now = new Date();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const fromDate = new Date(now.getTime() - thirtyDaysMs);
  const statsDateFrom = fromDate.toISOString();
  const statsDateTo = now.toISOString();

  // 3. Query only new customers (isNewCustomer = true)
  const newCustomerRequest = {
    statsDateFrom,
    statsDateTo,
    isNewCustomer: true,
    page: 1 as number & tags.Type<"int32">,
    limit: 50 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCustomerDailyStat.IRequest;

  const newCustomerPage: IPageIShoppingMallCustomerDailyStat.ISummary =
    await api.functional.shoppingMall.admin.analytics.customerDailyStats.index(
      connection,
      {
        body: newCustomerRequest,
      },
    );
  typia.assert(newCustomerPage);

  // Ensure all rows in data have is_new_customer === true
  for (const row of newCustomerPage.data) {
    TestValidator.predicate(
      "all rows with isNewCustomer=true filter must have is_new_customer === true",
      row.is_new_customer === true,
    );
  }

  // 4. Query only non-new customers (isNewCustomer = false)
  const nonNewCustomerRequest = {
    statsDateFrom,
    statsDateTo,
    isNewCustomer: false,
    page: 1 as number & tags.Type<"int32">,
    limit: 50 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCustomerDailyStat.IRequest;

  const nonNewCustomerPage: IPageIShoppingMallCustomerDailyStat.ISummary =
    await api.functional.shoppingMall.admin.analytics.customerDailyStats.index(
      connection,
      {
        body: nonNewCustomerRequest,
      },
    );
  typia.assert(nonNewCustomerPage);

  for (const row of nonNewCustomerPage.data) {
    TestValidator.predicate(
      "all rows with isNewCustomer=false filter must have is_new_customer === false",
      row.is_new_customer === false,
    );
  }

  // 5. Query customers with repeat orders (hasRepeatOrders = true)
  const repeatCustomerRequest = {
    statsDateFrom,
    statsDateTo,
    hasRepeatOrders: true,
    page: 1 as number & tags.Type<"int32">,
    limit: 50 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCustomerDailyStat.IRequest;

  const repeatCustomerPage: IPageIShoppingMallCustomerDailyStat.ISummary =
    await api.functional.shoppingMall.admin.analytics.customerDailyStats.index(
      connection,
      {
        body: repeatCustomerRequest,
      },
    );
  typia.assert(repeatCustomerPage);

  for (const row of repeatCustomerPage.data) {
    TestValidator.predicate(
      "all rows with hasRepeatOrders=true filter must have has_repeat_orders === true",
      row.has_repeat_orders === true,
    );
  }

  // 6. Optional: Query intersection of isNewCustomer=true and hasRepeatOrders=true
  const newAndRepeatRequest = {
    statsDateFrom,
    statsDateTo,
    isNewCustomer: true,
    hasRepeatOrders: true,
    page: 1 as number & tags.Type<"int32">,
    limit: 50 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCustomerDailyStat.IRequest;

  const newAndRepeatPage: IPageIShoppingMallCustomerDailyStat.ISummary =
    await api.functional.shoppingMall.admin.analytics.customerDailyStats.index(
      connection,
      {
        body: newAndRepeatRequest,
      },
    );
  typia.assert(newAndRepeatPage);

  for (const row of newAndRepeatPage.data) {
    TestValidator.predicate(
      "rows with both isNewCustomer=true and hasRepeatOrders=true must satisfy both flags",
      row.is_new_customer === true && row.has_repeat_orders === true,
    );
  }
}
