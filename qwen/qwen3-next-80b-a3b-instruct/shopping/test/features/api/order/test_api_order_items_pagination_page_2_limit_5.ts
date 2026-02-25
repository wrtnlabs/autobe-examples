import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_order_items_pagination_page_2_limit_5(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate customer to have valid authorization
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Use a known order ID from test environment (assumed to exist)
  // We assume there's an order with at least 10 items for this customer
  // Since we have no way to create order, we rely on test environment having pre-created data
  const knownOrderId = "c1b8e3d5-1d74-4f13-9d9f-23a0e3a8d4bc";
  // 3. Retrieve page 1 (baseline)
  const orderItemsPage1 =
    await api.functional.shoppingMall.customer.orders.items.index(
      customerConnection,
      {
        orderId: knownOrderId,
        body: {
          page: 1,
          limit: 5,
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(orderItemsPage1);
  // 4. Retrieve page 2 with limit 5
  const orderItemsPage2 =
    await api.functional.shoppingMall.customer.orders.items.index(
      customerConnection,
      {
        orderId: knownOrderId,
        body: {
          page: 2,
          limit: 5,
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(orderItemsPage2);
  // 5. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    orderItemsPage2.pagination.current,
    2,
  );
  TestValidator.equals("pagination limit", orderItemsPage2.pagination.limit, 5);
  TestValidator.predicate(
    "pagination has more than 2 pages",
    orderItemsPage2.pagination.pages > 1,
  );
  TestValidator.predicate(
    "pagination records sufficient for page 2",
    orderItemsPage2.pagination.records >= 10,
  );
  TestValidator.equals("items on page 2 count", orderItemsPage2.data.length, 5);
  // 6. Validate no duplicate items across pages
  const page1Ids = orderItemsPage1.data.map((item) => item.id);
  const page2Ids = orderItemsPage2.data.map((item) => item.id);
  for (const id of page2Ids) {
    TestValidator.notEquals(
      "item ID not duplicated across pages",
      page1Ids.includes(id),
      true,
    );
  }
  // 7. Validate all items have correct fields
  for (const item of [...orderItemsPage1.data, ...orderItemsPage2.data]) {
    TestValidator.predicate(
      "product_name exists",
      typeof item.product_name === "string" && item.product_name.length > 0,
    );
    TestValidator.predicate(
      "sku_code exists",
      typeof item.sku_code === "string" && item.sku_code.length > 0,
    );
    TestValidator.predicate(
      "quantity is positive integer",
      typeof item.quantity === "number" && item.quantity >= 1,
    );
    TestValidator.predicate(
      "price_at_time_of_purchase is positive",
      typeof item.price_at_time_of_purchase === "number" &&
        item.price_at_time_of_purchase > 0,
    );
    TestValidator.predicate(
      "status is valid",
      ["paid", "shipped", "delivered", "cancelled", "refunded"].includes(
        item.status,
      ),
    );
    TestValidator.predicate(
      "created_at is ISO datetime",
      typeof item.created_at === "string" &&
        !isNaN(new Date(item.created_at).getTime()),
    );
    TestValidator.predicate(
      "seller exists",
      typeof item.seller === "object" && item.seller !== null,
    );
    TestValidator.predicate(
      "seller shop_name exists",
      typeof item.seller.shop_name === "string" &&
        item.seller.shop_name.length > 0,
    );
    TestValidator.predicate(
      "seller logo_url exists",
      typeof item.seller.logo_url === "string" &&
        item.seller.logo_url.length > 0,
    );
    TestValidator.predicate(
      "seller status exists",
      typeof item.seller.status === "string" && item.seller.status.length > 0,
    );
  }
}
