import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductInventoryRecord";
import type { IShoppingMallProductOptionDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionDefinition";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductRating } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductRating";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_products_variants_inventory_update } from "../../../generate/generate_random_shopping_mall_seller_products_variants_inventory_update";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_inventory_record } from "../../../prepare/prepare_random_shopping_mall_product_inventory_record";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test administrator cart retrieval when cart contains items with mixed availability states.
 *
 * This test verifies that administrators can retrieve customer carts containing items
 * with different availability states: in-stock, out-of-stock, and deleted variants.
 * The administrator should be able to see all cart items for customer support purposes,
 * with appropriate indicators for item availability.
 */
export async function test_api_administrator_cart_retrieval_mixed_availability(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 3. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 4. Seller creates product (generate_random function handles category internally)
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 5. Seller creates multiple variants (3 variants for different scenarios)
  const variant1 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant1);
  const variant2 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant2);
  const variant3 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant3);
  // 6. Seller adjusts inventory - variant1 gets stock, variant2 gets zero stock
  const inventoryRecord1 =
    await generate_random_shopping_mall_seller_products_variants_inventory_update(
      sellerConnection,
      {
        params: { productId: product.id, variantId: variant1.id },
        body: {
          quantity_change: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<100>
          >(),
          reason: "Initial stock",
        } satisfies IShoppingMallProductInventoryRecord.ICreate,
      },
    );
  typia.assert(inventoryRecord1);
  TestValidator.predicate(
    "variant1 has positive stock",
    inventoryRecord1.current_stock > 0,
  );
  const inventoryRecord2 =
    await generate_random_shopping_mall_seller_products_variants_inventory_update(
      sellerConnection,
      {
        params: { productId: product.id, variantId: variant2.id },
        body: {
          quantity_change: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
          reason: "Initial stock for out-of-stock test",
        } satisfies IShoppingMallProductInventoryRecord.ICreate,
      },
    );
  typia.assert(inventoryRecord2);
  // Reduce variant2 stock to zero to create out-of-stock scenario
  const inventoryRecord2Reduce =
    await generate_random_shopping_mall_seller_products_variants_inventory_update(
      sellerConnection,
      {
        params: { productId: product.id, variantId: variant2.id },
        body: {
          quantity_change: -inventoryRecord2.current_stock,
          reason: "Stock depletion for testing",
        } satisfies IShoppingMallProductInventoryRecord.ICreate,
      },
    );
  typia.assert(inventoryRecord2Reduce);
  TestValidator.equals(
    "variant2 is out of stock",
    inventoryRecord2Reduce.current_stock,
    0,
  );
  // 7. Customer adds in-stock variant (variant1) to cart
  const cartItem1 =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          shopping_mall_product_variant_id: variant1.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3>
          >(),
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem1);
  // 8. Customer adds out-of-stock variant (variant2) to cart
  const cartItem2 =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          shopping_mall_product_variant_id: variant2.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<2>
          >(),
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem2);
  // 9. Seller deletes variant3 (to test deleted variant handling)
  await api.functional.shoppingMall.seller.products.variants.erase(
    sellerConnection,
    {
      productId: product.id,
      variantId: variant3.id,
    },
  );
  // Get the cart ID from the cart item
  const cartId = cartItem1.cart.id;
  // 10. Administrator retrieves the cart
  const cart = await api.functional.shoppingMall.administrator.carts.at(
    adminConnection,
    {
      cartId: cartId,
    },
  );
  typia.assert(cart);
  // Validate cart structure
  TestValidator.equals(
    "cart belongs to customer",
    cart.customer.id,
    customerAuth.id,
  );
  TestValidator.predicate("cart has at least 2 items", cart.items.length >= 2);
  // Validate cart items are present
  const cartItemIds = cart.items.map((item) => item.id);
  TestValidator.predicate(
    "cart contains variant1 item",
    cartItemIds.includes(cartItem1.id),
  );
  TestValidator.predicate(
    "cart contains variant2 item",
    cartItemIds.includes(cartItem2.id),
  );
  // Validate item details
  const foundItem1 = cart.items.find((item) => item.id === cartItem1.id);
  const foundItem2 = cart.items.find((item) => item.id === cartItem2.id);
  TestValidator.notEquals("found item1", foundItem1, undefined);
  TestValidator.notEquals("found item2", foundItem2, undefined);
  if (foundItem1 !== undefined && foundItem2 !== undefined) {
    TestValidator.equals(
      "item1 variant matches",
      foundItem1.productVariant.id,
      variant1.id,
    );
    TestValidator.equals(
      "item2 variant matches",
      foundItem2.productVariant.id,
      variant2.id,
    );
    TestValidator.equals(
      "item1 quantity matches",
      foundItem1.quantity,
      cartItem1.quantity,
    );
    TestValidator.equals(
      "item2 quantity matches",
      foundItem2.quantity,
      cartItem2.quantity,
    );
  }
}
