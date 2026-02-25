import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShoppingCart";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingCart";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_cart_view(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated customer connection by joining
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: RandomGenerator.alphabets(5) + "@test.com",
      password: "12341234",
      href: "https://example.com/join",
      referrer: "https://example.com/ref",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // 2. Call the cart view endpoint - customer can view their own cart
  const cartResponse: IPageIShoppingMallShoppingCart.ISummary =
    await api.functional.shoppingMall.customer.cart.at(customerConnection);
  // 3. Validate response structure with complete type validation
  typia.assert(cartResponse);
  // 4. Validate pagination metadata
  TestValidator.equals(
    "current page is positive",
    cartResponse.pagination.current,
    1,
  );
  TestValidator.equals("limit is positive", cartResponse.pagination.limit, 10);
  TestValidator.equals(
    "records count is non-negative",
    cartResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "pages is non-negative",
    cartResponse.pagination.pages,
    0,
  );
  // 5. Validate cart items structure if any exist
  if (cartResponse.data.length > 0) {
    for (const item of cartResponse.data) {
      // Validate cart item structure with complete type checking
      typia.assert<IShoppingMallShoppingCart.ISummary>(item);
      // Validate customer matches authenticated user
      TestValidator.equals(
        "customer id matches authenticated user",
        item.customer.id,
        customer.id,
      );
      TestValidator.equals(
        "customer email matches",
        item.customer.email,
        customer.email,
      );
      // Validate variant has required fields
      TestValidator.predicate("variant has id", item.variant.id !== undefined);
      TestValidator.predicate(
        "variant has sku_code",
        item.variant.sku_code !== undefined,
      );
      TestValidator.predicate(
        "variant has shopping_mall_product_id",
        item.variant.shopping_mall_product_id !== undefined,
      );
      // Validate variant stock quantity
      TestValidator.predicate(
        "variant stock quantity is non-negative",
        item.variant.stock_quantity >= 0,
      );
      // Validate quantity
      TestValidator.predicate(
        "cart item quantity is positive",
        item.quantity > 0,
      );
      TestValidator.predicate(
        "cart item quantity is valid integer",
        Number.isInteger(item.quantity),
      );
    }
  } else {
    // Test empty cart scenario
    TestValidator.equals(
      "empty cart has zero records",
      cartResponse.pagination.records,
      0,
    );
    TestValidator.equals(
      "empty cart has zero items in data",
      cartResponse.data.length,
      0,
    );
  }
  // 6. Validate data consistency
  const totalItems = cartResponse.data.length;
  const expectedPages =
    totalItems === 0
      ? 0
      : Math.ceil(totalItems / cartResponse.pagination.limit);
  TestValidator.equals(
    "calculated pages matches",
    cartResponse.pagination.pages,
    expectedPages,
  );
  // 7. Test pagination with limit parameter if supported by API
  // Note: Since no cart manipulation functions are provided in the API, we cannot test cart population
  // This test focuses on cart view functionality with empty or pre-populated cart
  TestValidator.predicate(
    "data array length matches or less than limit",
    cartResponse.data.length <= cartResponse.pagination.limit,
  );
}
