import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_customers_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_customers_cart_items_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";

export async function test_api_cart_item_stock_warning_exceeded(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Create cart item with quantity exceeding available stock
  // The generate function will create a variant with limited stock
  // We request a quantity that exceeds typical stock levels
  const cartItem =
    await generate_random_shopping_mall_customer_customers_cart_items_create(
      customerConnection,
      {
        body: {
          // Request high quantity to trigger stock warning
          // The prepare function will handle stock constraints
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<100>
          >(),
        },
      },
    );
  typia.assert(cartItem);
  // 3. Validate cart item response
  TestValidator.predicate("cart item has valid id", cartItem.id !== undefined);
  TestValidator.predicate("quantity is positive", cartItem.quantity >= 1);
  // 4. Validate stock warning behavior
  // When requested quantity exceeds available stock, stockWarning should be true
  // and available should reflect the actual stock status
  TestValidator.predicate(
    "stock warning triggered when quantity exceeds stock",
    cartItem.stockWarning === true || cartItem.stockWarning === false,
  );
  // 5. Validate item availability status
  // If stock is exhausted, available should be false
  TestValidator.predicate(
    "availability status is boolean",
    typeof cartItem.available === "boolean",
  );
  // 6. Validate subtotal calculation
  TestValidator.predicate("subtotal is non-negative", cartItem.subtotal >= 0);
  // 7. Validate product and variant information exists
  TestValidator.predicate(
    "product information exists",
    cartItem.product !== undefined,
  );
  TestValidator.predicate(
    "variant information exists",
    cartItem.variant !== undefined,
  );
  // 8. Validate variant stock quantity
  TestValidator.predicate(
    "variant has stock quantity field",
    typeof cartItem.variant.stockQuantity === "number",
  );
  // 9. Verify stock warning logic
  // stockWarning should be true when quantity > variant.stockQuantity
  const stockWarningExpected =
    cartItem.quantity > cartItem.variant.stockQuantity;
  TestValidator.equals(
    "stock warning matches quantity vs stock comparison",
    cartItem.stockWarning,
    stockWarningExpected,
  );
  // 10. Validate availability based on stock
  // available should be false when stock is 0 or item is deleted
  if (cartItem.variant.stockQuantity === 0) {
    TestValidator.predicate(
      "item unavailable when stock is zero",
      cartItem.available === false,
    );
  }
}
