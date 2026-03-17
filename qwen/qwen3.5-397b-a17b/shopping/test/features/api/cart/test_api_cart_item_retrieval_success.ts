import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
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

/**
 * Test retrieving a specific cart item by ID.
 *
 * This test validates the complete flow:
 * 1. Customer registration and authentication
 * 2. Adding a product variant to the shopping cart
 * 3. Retrieving the specific cart item by its ID
 * 4. Validating subtotal calculation and availability status
 */
export async function test_api_cart_item_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_customer_join(customerConnection, {
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
  typia.assert(authResult);
  // 2. Add a product variant to the customer's cart
  const cartItem =
    await generate_random_shopping_mall_customer_customers_cart_items_create(
      customerConnection,
      {},
    );
  typia.assert(cartItem);
  // 3. Retrieve the specific cart item by ID
  const retrievedItem =
    await api.functional.shoppingMall.customer.cart.items.at(
      customerConnection,
      {
        itemId: cartItem.id,
      },
    );
  typia.assert(retrievedItem);
  // 4. Validate cart item ID matches
  TestValidator.equals("cart item ID matches", retrievedItem.id, cartItem.id);
  // 5. Validate quantity matches
  TestValidator.equals(
    "quantity matches",
    retrievedItem.quantity,
    cartItem.quantity,
  );
  // 6. Validate subtotal calculation (variant price × quantity)
  const variantPrice =
    retrievedItem.variant.price ?? retrievedItem.product.basePrice;
  const expectedSubtotal = variantPrice * retrievedItem.quantity;
  TestValidator.equals(
    "subtotal calculation correct",
    retrievedItem.subtotal,
    expectedSubtotal,
  );
  // 7. Validate availability reflects stock status
  TestValidator.predicate(
    "available reflects stock > 0",
    retrievedItem.available === retrievedItem.variant.stockQuantity > 0,
  );
  // 8. Validate stock warning flag
  TestValidator.predicate(
    "stockWarning when quantity exceeds stock",
    retrievedItem.stockWarning ===
      retrievedItem.variant.stockQuantity < retrievedItem.quantity,
  );
  // 9. Validate product information is present
  TestValidator.equals(
    "product ID matches",
    retrievedItem.product.id,
    cartItem.product.id,
  );
  TestValidator.equals(
    "product name exists",
    retrievedItem.product.name.length > 0,
    true,
  );
  // 10. Validate variant information is present
  TestValidator.equals(
    "variant ID matches",
    retrievedItem.variant.id,
    cartItem.variant.id,
  );
  TestValidator.equals(
    "variant SKU code exists",
    retrievedItem.variant.skuCode.length > 0,
    true,
  );
}
