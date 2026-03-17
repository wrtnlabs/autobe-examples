import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";

export async function test_api_order_item_list_pagination_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      nickname: "TestCustomer",
      phone_number: "01012345678",
      href: "https://example.com/join",
      referrer: "https://example.com/",
      ip: null,
    },
  });
  typia.assert(customerAuth);
  // 2. Create an order with multiple items
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {},
  );
  typia.assert(order);
  // Verify order has multiple items for pagination testing
  TestValidator.predicate("order has items", () => order.items.length > 0);
  const orderId = order.id;
  const totalItems = order.items.length;
  // 3. Test pagination - first page with limit=5, page=1
  const firstPage: IPageIShoppingMallOrderItem.ISummary =
    await api.functional.shoppingMall.customer.orders.items.index(
      customerConnection,
      {
        orderId: orderId,
        body: {
          limit: 5,
          page: 1,
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(firstPage);
  // 4. Verify first page pagination metadata
  TestValidator.equals("first page current", firstPage.pagination.current, 1);
  TestValidator.equals("first page limit", firstPage.pagination.limit, 5);
  TestValidator.equals(
    "first page records",
    firstPage.pagination.records,
    totalItems,
  );
  TestValidator.equals(
    "first page pages",
    firstPage.pagination.pages,
    Math.ceil(totalItems / 5),
  );
  TestValidator.predicate(
    "first page has items",
    () => firstPage.data.length > 0,
  );
  TestValidator.predicate(
    "first page max 5 items",
    () => firstPage.data.length <= 5,
  );
  // 5. Test pagination - second page with limit=5, page=2 (if enough items)
  if (totalItems > 5) {
    const secondPage: IPageIShoppingMallOrderItem.ISummary =
      await api.functional.shoppingMall.customer.orders.items.index(
        customerConnection,
        {
          orderId: orderId,
          body: {
            limit: 5,
            page: 2,
          } satisfies IShoppingMallOrderItem.IRequest,
        },
      );
    typia.assert(secondPage);
    // 6. Verify second page pagination metadata
    TestValidator.equals(
      "second page current",
      secondPage.pagination.current,
      2,
    );
    TestValidator.equals("second page limit", secondPage.pagination.limit, 5);
    TestValidator.equals(
      "second page records",
      secondPage.pagination.records,
      totalItems,
    );
    TestValidator.predicate(
      "second page has items",
      () => secondPage.data.length > 0,
    );
    // Verify first and second page items are different
    const firstPageIds = firstPage.data.map((item) => item.id);
    const secondPageIds = secondPage.data.map((item) => item.id);
    TestValidator.predicate("pages have different items", () => {
      return !firstPageIds.some((id) => secondPageIds.includes(id));
    });
  }
  // 7. Test sorting by created_at,desc (newest first - default)
  const sortedByCreatedAt: IPageIShoppingMallOrderItem.ISummary =
    await api.functional.shoppingMall.customer.orders.items.index(
      customerConnection,
      {
        orderId: orderId,
        body: {
          sort: "created_at,desc",
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(sortedByCreatedAt);
  // Verify items are sorted by created_at descending
  if (sortedByCreatedAt.data.length > 1) {
    TestValidator.predicate("sorted by created_at desc", () => {
      for (let i = 1; i < sortedByCreatedAt.data.length; i++) {
        const prev = new Date(sortedByCreatedAt.data[i - 1].created_at);
        const curr = new Date(sortedByCreatedAt.data[i].created_at);
        if (prev < curr) {
          return false;
        }
      }
      return true;
    });
  }
  // 8. Test sorting by status,asc
  const sortedByStatus: IPageIShoppingMallOrderItem.ISummary =
    await api.functional.shoppingMall.customer.orders.items.index(
      customerConnection,
      {
        orderId: orderId,
        body: {
          sort: "status,asc",
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(sortedByStatus);
  // 9. Verify snapshot data is present (typia.assert already validates structure)
  TestValidator.predicate("first page items have snapshots", () => {
    return firstPage.data.every(
      (item) =>
        item.productSnapshot &&
        item.productVariantSnapshot &&
        item.seller &&
        item.order,
    );
  });
}
