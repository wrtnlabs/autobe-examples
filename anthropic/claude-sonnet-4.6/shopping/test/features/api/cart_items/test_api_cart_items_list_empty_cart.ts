import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCartItem";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_cart_items_list_empty_cart(
  connection: api.IConnection,
): Promise<void> {
  // === Step 1: Register Customer 1 (no cart items) ===
  const customerConnection1: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection1, {});
  // === Step 2: List cart items with default pagination (empty body) ===
  const defaultResult =
    await api.functional.shoppingMall.customer.cartItems.index(
      customerConnection1,
      {
        body: {} satisfies IShoppingMallCartItem.IRequest,
      },
    );
  typia.assert(defaultResult);
  // Validate: data is empty array
  TestValidator.equals("default - data is empty", defaultResult.data.length, 0);
  // Validate pagination metadata
  TestValidator.equals(
    "default - records is 0",
    defaultResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "default - pages is 0",
    defaultResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "default - current page is 1",
    defaultResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "default - limit is 20",
    defaultResult.pagination.limit,
    20,
  );
  // === Step 3: List cart items with explicit pagination (page: 1, limit: 5) ===
  const paginatedResult =
    await api.functional.shoppingMall.customer.cartItems.index(
      customerConnection1,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies IShoppingMallCartItem.IRequest,
      },
    );
  typia.assert(paginatedResult);
  // Validate: data is still empty
  TestValidator.equals(
    "paginated - data is empty",
    paginatedResult.data.length,
    0,
  );
  // Validate pagination metadata
  TestValidator.equals(
    "paginated - records is 0",
    paginatedResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "paginated - pages is 0",
    paginatedResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "paginated - limit is 5",
    paginatedResult.pagination.limit,
    5,
  );
  // === Step 4: Data Isolation — Register Customer 2 (no cart items) ===
  const customerConnection2: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection2, {});
  // === Step 5: List cart items for Customer 2 ===
  const isolationResult =
    await api.functional.shoppingMall.customer.cartItems.index(
      customerConnection2,
      {
        body: {} satisfies IShoppingMallCartItem.IRequest,
      },
    );
  typia.assert(isolationResult);
  // Validate: Customer 2 also has an empty cart
  TestValidator.equals(
    "isolation - data is empty",
    isolationResult.data.length,
    0,
  );
  TestValidator.equals(
    "isolation - records is 0",
    isolationResult.pagination.records,
    0,
  );
}
