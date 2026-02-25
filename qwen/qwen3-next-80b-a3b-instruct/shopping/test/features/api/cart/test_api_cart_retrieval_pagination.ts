import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCartItem";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_cart_retrieval_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallCustomer.IJoin;
  const authorized = await authorize_customer_join(customerConnection, {
    body: customerData,
  });
  typia.assert(authorized);
  // 2. Test pagination with page=2 and limit=5 on empty cart
  // The cart is empty on creation
  const payload: IShoppingMallCart.IRequest = {
    page: 2,
    limit: 5,
    in_stock_only: false,
  };
  const response = await api.functional.shoppingMall.customer.carts.index(
    customerConnection,
    { body: payload },
  );
  typia.assert(response);
  // 3. Validate pagination metadata on empty cart
  TestValidator.equals("current page", response.pagination.current, 2);
  TestValidator.equals("limit", response.pagination.limit, 5);
  TestValidator.equals("total records", response.pagination.records, 0); // Empty cart
  TestValidator.equals("total pages", response.pagination.pages, 0); // No pages with 0 records
  // 4. Test edge case: page=1, limit=5 on empty cart
  const page1 = await api.functional.shoppingMall.customer.carts.index(
    customerConnection,
    { body: { page: 1, limit: 5, in_stock_only: false } },
  );
  typia.assert(page1);
  TestValidator.equals("current page (page 1)", page1.pagination.current, 1);
  TestValidator.equals("items on page 1", page1.data.length, 0);
  TestValidator.equals("total records (page 1)", page1.pagination.records, 0);
  TestValidator.equals("total pages (page 1)", page1.pagination.pages, 0);
  // 5. Test pagination with page=100 (beyond possible range)
  const page100 = await api.functional.shoppingMall.customer.carts.index(
    customerConnection,
    { body: { page: 100, limit: 5, in_stock_only: false } },
  );
  typia.assert(page100);
  TestValidator.equals(
    "current page (page 100)",
    page100.pagination.current,
    100,
  );
  TestValidator.equals("items on page 100", page100.data.length, 0);
  TestValidator.equals(
    "total records (page 100)",
    page100.pagination.records,
    0,
  );
  TestValidator.equals("total pages (page 100)", page100.pagination.pages, 0);
  // 6. Test in_stock_only=false returns same results as default (no items)
  const allItems = await api.functional.shoppingMall.customer.carts.index(
    customerConnection,
    { body: { page: 1, limit: 5, in_stock_only: false } },
  );
  typia.assert(allItems);
  TestValidator.equals(
    "total records with in_stock_only=false",
    allItems.pagination.records,
    0,
  );
  TestValidator.equals(
    "items with in_stock_only=false",
    allItems.data.length,
    0,
  );
  // 7. Test default values for page and limit
  const defaultResponse =
    await api.functional.shoppingMall.customer.carts.index(customerConnection, {
      body: { in_stock_only: false },
    });
  typia.assert(defaultResponse);
  TestValidator.equals("default page", defaultResponse.pagination.current, 1);
  TestValidator.equals("default limit", defaultResponse.pagination.limit, 100);
}