import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShoppingCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShoppingCart";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_carts_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_carts_items_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";

/**
 * Test the primary success path for retrieving a specific cart item from a customer's shopping cart.
 * The test should verify that when a customer retrieves a cart item, the system returns complete
 * cart item information including the product variant details, quantity, unit price, and timestamps.
 */
export async function test_api_cart_item_retrieval_with_price_snapshot(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<
          string & tags.Format<"email">
        >() satisfies string as string &
          tags.Format<"email"> &
          tags.MinLength<1> &
          tags.MaxLength<255>,
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<
          string & tags.Format<"uri">
        >() satisfies string as string & tags.Format<"uri">,
        referrer: typia.random<
          string & tags.Format<"uri">
        >() satisfies string as string & tags.Format<"uri">,
      },
    });
  typia.assert(customerAuth);
  // Create new connection with customer token
  const authenticatedCustomerConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: customerAuth.token.access },
  };
  // 2. Create customer cart
  const cart: IEcommerceMallShoppingCart =
    await api.functional.ecommerceMall.customer.carts.create(
      authenticatedCustomerConnection,
    );
  typia.assert(cart);
  // 3. Add product variant to cart with quantity = 1
  const cartItemWithQty1: IEcommerceMallCartItem =
    await generate_random_ecommerce_mall_customer_carts_items_create(
      authenticatedCustomerConnection,
      {
        body: {
          variant_id: typia.random<string & tags.Format<"uuid">>(),
          quantity: 1,
        },
        params: { cartId: cart.id },
      },
    );
  typia.assert(cartItemWithQty1);
  const originalPrice = cartItemWithQty1.price;
  const originalQuantity = cartItemWithQty1.quantity;
  TestValidator.equals("quantity is 1", originalQuantity, 1);
  TestValidator.predicate("price is positive", originalPrice > 0);
  // 4. Retrieve the cart item
  const retrievedItem: IEcommerceMallCartItem =
    await api.functional.ecommerceMall.customer.carts.items.at(
      authenticatedCustomerConnection,
      {
        cartId: cart.id,
        itemId: cartItemWithQty1.id,
      },
    );
  typia.assert(retrievedItem);
  // 5. Validate cart item fields
  TestValidator.equals(
    "cart item ID matches",
    retrievedItem.id,
    cartItemWithQty1.id,
  );
  TestValidator.equals(
    "quantity preserved",
    retrievedItem.quantity,
    originalQuantity,
  );
  TestValidator.equals(
    "price snapshot preserved",
    retrievedItem.price,
    originalPrice,
  );
  TestValidator.equals(
    "deletedAt is null for active item",
    retrievedItem.deletedAt,
    null,
  );
  TestValidator.equals(
    "cart reference ID matches",
    retrievedItem.cart.id,
    cart.id,
  );
  // 6. Validate variant reference
  TestValidator.equals(
    "variant ID matches",
    retrievedItem.variant.id,
    cartItemWithQty1.variant.id,
  );
  TestValidator.predicate(
    "SKU code present",
    retrievedItem.variant.skuCode.length > 0,
  );
  TestValidator.predicate("optionValues is valid JSON", () => {
    try {
      JSON.parse(retrievedItem.variant.optionValues);
      return true;
    } catch {
      return false;
    }
  });
  TestValidator.predicate(
    "priceOverride is valid",
    retrievedItem.variant.priceOverride === null ||
      (typeof retrievedItem.variant.priceOverride === "number" &&
        retrievedItem.variant.priceOverride >= 0),
  );
  TestValidator.predicate(
    "stockQuantity is non-negative",
    retrievedItem.variant.stockQuantity >= 0,
  );
  TestValidator.predicate(
    "isActive is boolean",
    typeof retrievedItem.variant.isActive === "boolean",
  );
  // 7. Validate nested product reference
  TestValidator.predicate(
    "product name present",
    retrievedItem.variant.product.name.length > 0,
  );
  TestValidator.predicate(
    "product basePrice is positive",
    retrievedItem.variant.product.basePrice > 0,
  );
  TestValidator.predicate(
    "product isActive is boolean",
    typeof retrievedItem.variant.product.isActive === "boolean",
  );
  // 8. Validate timestamps
  TestValidator.predicate(
    "createdAt is valid date-time",
    new Date(retrievedItem.createdAt).getTime() > 0,
  );
  TestValidator.predicate(
    "updatedAt is valid date-time",
    new Date(retrievedItem.updatedAt).getTime() > 0,
  );
  // 9. Test with quantity = 5
  const cartItemWithQty5: IEcommerceMallCartItem =
    await generate_random_ecommerce_mall_customer_carts_items_create(
      authenticatedCustomerConnection,
      {
        body: {
          variant_id: typia.random<string & tags.Format<"uuid">>(),
          quantity: 5,
        },
        params: { cartId: cart.id },
      },
    );
  typia.assert(cartItemWithQty5);
  const qty5Price = cartItemWithQty5.price;
  const qty5Quantity = cartItemWithQty5.quantity;
  TestValidator.equals("quantity is 5", qty5Quantity, 5);
  TestValidator.predicate("price is positive", qty5Price > 0);
  const retrievedQty5Item: IEcommerceMallCartItem =
    await api.functional.ecommerceMall.customer.carts.items.at(
      authenticatedCustomerConnection,
      {
        cartId: cart.id,
        itemId: cartItemWithQty5.id,
      },
    );
  typia.assert(retrievedQty5Item);
  TestValidator.equals("quantity 5 preserved", retrievedQty5Item.quantity, 5);
  TestValidator.equals(
    "price 5 snapshot preserved",
    retrievedQty5Item.price,
    qty5Price,
  );
  // 10. Test with quantity = 10
  const cartItemWithQty10: IEcommerceMallCartItem =
    await generate_random_ecommerce_mall_customer_carts_items_create(
      authenticatedCustomerConnection,
      {
        body: {
          variant_id: typia.random<string & tags.Format<"uuid">>(),
          quantity: 10,
        },
        params: { cartId: cart.id },
      },
    );
  typia.assert(cartItemWithQty10);
  const qty10Price = cartItemWithQty10.price;
  const qty10Quantity = cartItemWithQty10.quantity;
  TestValidator.equals("quantity is 10", qty10Quantity, 10);
  TestValidator.predicate("price is positive", qty10Price > 0);
  const retrievedQty10Item: IEcommerceMallCartItem =
    await api.functional.ecommerceMall.customer.carts.items.at(
      authenticatedCustomerConnection,
      {
        cartId: cart.id,
        itemId: cartItemWithQty10.id,
      },
    );
  typia.assert(retrievedQty10Item);
  TestValidator.equals(
    "quantity 10 preserved",
    retrievedQty10Item.quantity,
    10,
  );
  TestValidator.equals(
    "price 10 snapshot preserved",
    retrievedQty10Item.price,
    qty10Price,
  );
  // 11. Verify ownership
  TestValidator.equals(
    "cart customer ID matches",
    retrievedItem.cart.customerId,
    customerAuth.id,
  );
}
