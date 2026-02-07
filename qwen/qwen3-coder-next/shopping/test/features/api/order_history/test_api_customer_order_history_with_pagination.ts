import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrder";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_order_history_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      name: RandomGenerator.name(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // Test pagination functionality - basic page 1 with limit 5
  const page1 = await api.functional.shoppingMall.customer.orders.index(
    customerConnection,
    {
      body: {
        status: "all",
        page: 1,
        limit: 5,
        sort: ["+created_at"],
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(page1);
  TestValidator.equals("page 1 has 5 items", page1.data.length, 5);
  TestValidator.equals("page 1 pagination", page1.pagination.current, 1);
  TestValidator.equals("page 1 pagination limit", page1.pagination.limit, 5);
  // Test page 2 with limit 5
  const page2 = await api.functional.shoppingMall.customer.orders.index(
    customerConnection,
    {
      body: {
        status: "all",
        page: 2,
        limit: 5,
        sort: ["+created_at"],
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals("page 2 has 5 items", page2.data.length, 5);
  TestValidator.equals("page 2 pagination", page2.pagination.current, 2);
  // Test total counts and pages calculation
  const total = await api.functional.shoppingMall.customer.orders.index(
    customerConnection,
    {
      body: {
        status: "all",
        page: 1,
        limit: 100,
        sort: ["+created_at"],
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(total);
  TestValidator.predicate(
    "total records positive",
    total.pagination.records > 0,
  );
  TestValidator.predicate("total pages >= 1", total.pagination.pages >= 1);
  // Test different sort options
  const newest = await api.functional.shoppingMall.customer.orders.index(
    customerConnection,
    {
      body: {
        status: "all",
        page: 1,
        limit: 5,
        sort: ["-created_at"],
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(newest);
  const oldest = await api.functional.shoppingMall.customer.orders.index(
    customerConnection,
    {
      body: {
        status: "all",
        page: 1,
        limit: 5,
        sort: ["+created_at"],
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(oldest);
  // Test status filtering
  const paidOrders = await api.functional.shoppingMall.customer.orders.index(
    customerConnection,
    {
      body: {
        status: "paid",
        page: 1,
        limit: 100,
        sort: ["+created_at"],
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(paidOrders);
  // Test date range filtering
  const recentOrders = await api.functional.shoppingMall.customer.orders.index(
    customerConnection,
    {
      body: {
        status: "all",
        start_date: new Date(
          Date.now() - 7 * 24 * 60 * 60 * 1000,
        ).toISOString(), // last 7 days
        end_date: new Date().toISOString(),
        page: 1,
        limit: 100,
        sort: ["+created_at"],
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(recentOrders);
  // Test search functionality
  const searchOrders = await api.functional.shoppingMall.customer.orders.index(
    customerConnection,
    {
      body: {
        status: "all",
        search: "product",
        page: 1,
        limit: 100,
        sort: ["+created_at"],
      } satisfies IShoppingMallOrder.IRequest,
    },
  );
  typia.assert(searchOrders);
  // Test invalid pagination (page 0 should be invalid)
  await TestValidator.error("invalid page number 0", async () => {
    await api.functional.shoppingMall.customer.orders.index(
      customerConnection,
      {
        body: {
          status: "all",
          page: 0,
          limit: 5,
          sort: ["+created_at"],
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  });
  // Test limit constraints
  await TestValidator.error("excessive limit rejected", async () => {
    await api.functional.shoppingMall.customer.orders.index(
      customerConnection,
      {
        body: {
          status: "all",
          page: 1,
          limit: 10000, // Excessive limit
          sort: ["+created_at"],
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  });
  // Test authentication - unauthorized access should fail
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("unauthorized access rejected", async () => {
    await api.functional.shoppingMall.customer.orders.index(
      unauthenticatedConnection,
      {
        body: {
          status: "all",
          page: 1,
          limit: 5,
          sort: ["+created_at"],
        } satisfies IShoppingMallOrder.IRequest,
      },
    );
  });
}
