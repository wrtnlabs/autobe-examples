import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_orders_search_by_customer_email(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // Step 2: Test basic search with empty filters
  const allOrders = await api.functional.ecommerceMall.admin.orders.index(
    adminConnection,
    {
      body: {},
    },
  );
  typia.assert(allOrders);
  // Step 3: Test search by order number (partial matching)
  const ordersByNumber = await api.functional.ecommerceMall.admin.orders.index(
    adminConnection,
    {
      body: {
        orderNumber: "ORD",
      } satisfies IEcommerceMallOrder.IRequest,
    },
  );
  typia.assert(ordersByNumber);
  // Step 4: Test search by status filter
  const ordersByStatus = await api.functional.ecommerceMall.admin.orders.index(
    adminConnection,
    {
      body: {
        status: "paid",
      } satisfies IEcommerceMallOrder.IRequest,
    },
  );
  typia.assert(ordersByStatus);
  // Step 5: Test search with pagination parameters
  const pagedOrders = await api.functional.ecommerceMall.admin.orders.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallOrder.IRequest,
    },
  );
  typia.assert(pagedOrders);
  // Step 6: Test search with price range filter
  const priceFilteredOrders =
    await api.functional.ecommerceMall.admin.orders.index(adminConnection, {
      body: {
        minTotalPrice: 0,
        maxTotalPrice: 100000,
      } satisfies IEcommerceMallOrder.IRequest,
    });
  typia.assert(priceFilteredOrders);
  // Step 7: Test combined filters
  const combinedFilters = await api.functional.ecommerceMall.admin.orders.index(
    adminConnection,
    {
      body: {
        status: "shipped",
        page: 1,
        limit: 10,
      } satisfies IEcommerceMallOrder.IRequest,
    },
  );
  typia.assert(combinedFilters);
}
