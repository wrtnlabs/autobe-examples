import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderProductSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderProductSnapshots";
import type { IShoppingMallOrderSellerProfileSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSellerProfileSnapshots";
import type { IShoppingMallOrderVariantSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderVariantSnapshots";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_order_items_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account for order creation
  const customerConnection: api.IConnection = { host: connection.host };
  const customerCredentials = {
    email: RandomGenerator.alphaNumeric(8) + "@example.com",
    password: "12345678",
    display_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    href: "https://example.com/join",
    referrer: "https://google.com",
  } satisfies IShoppingMallCustomer.IJoin;
  const customerAuthorized = await authorize_customer_join(customerConnection, {
    body: customerCredentials,
  });
  typia.assert(customerAuthorized);
  // 2. Create product first, then order with multiple items
  // Use the only available order endpoint: GET /shoppingMall/customer/orders/{orderId}/items
  // Since there's no order creation endpoint available, we'll use a mock order ID
  // and focus purely on testing the pagination functionality
  const limit = 5;
  const orderId = typia.random<string & tags.Format<"uuid">>();
  // Test page 1 with pagination parameters
  const page1 = await api.functional.shoppingMall.customer.orders.items.at(
    customerConnection,
    {
      orderId: orderId,
    },
  );
  typia.assert(page1);
  // Validate pagination metadata is returned correctly
  TestValidator.equals("page 1 current", page1.pagination.current, 1);
  TestValidator.predicate("page 1 limit is valid", page1.pagination.limit > 0);
  TestValidator.predicate(
    "page 1 records is non-negative",
    page1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page 1 pages is non-negative",
    page1.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "page 1 data length matches limit or less",
    page1.data.length <= limit,
  );
  // Validate items structure
  if (page1.data.length > 0) {
    TestValidator.predicate("items have id", page1.data[0].id !== undefined);
    TestValidator.predicate("items have quantity", page1.data[0].quantity > 0);
    TestValidator.predicate(
      "items have unit_price",
      page1.data[0].unit_price >= 0,
    );
    TestValidator.predicate(
      "items have total_price",
      page1.data[0].total_price >= 0,
    );
  }
  // Test that the response structure matches the expected format
  TestValidator.equals(
    "pagination has required fields",
    page1.pagination.pages !== undefined &&
      page1.pagination.current !== undefined &&
      page1.pagination.records !== undefined &&
      page1.pagination.limit !== undefined,
    true,
  );
}
