import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
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

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_option_definitions_create } from "../../../generate/generate_random_shopping_mall_seller_products_option_definitions_create";
import { generate_random_shopping_mall_seller_products_option_definitions_option_values_create } from "../../../generate/generate_random_shopping_mall_seller_products_option_definitions_option_values_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_option_definition } from "../../../prepare/prepare_random_shopping_mall_product_option_definition";
import { prepare_random_shopping_mall_product_option_value } from "../../../prepare/prepare_random_shopping_mall_product_option_value";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test cart item update authorization validation.
 *
 * This test verifies that customers can only update cart items in their own cart.
 * Scenario:
 * 1. Create a seller and product with variants
 * 2. Create two customers (Customer A and Customer B)
 * 3. Add the same product variant to both customers' carts
 * 4. Customer A attempts to update Customer B's cart item
 * 5. Verify the system rejects with authorization error
 * 6. Verify the cart item ownership prevents cross-customer modifications
 */
export async function test_api_cart_item_update_authorization(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller and product setup
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  // Create product with a valid category reference
  // Note: In a real scenario, category_id would reference an existing category
  // For this test, we use a generated UUID assuming categories exist in the system
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // Create option definition
  const optionDefinition =
    await api.functional.shoppingMall.seller.products.option_definitions.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          name: "Color",
        } satisfies IShoppingMallProductOptionDefinition.ICreate,
      },
    );
  typia.assert(optionDefinition);
  // Create option value
  const optionValue =
    await api.functional.shoppingMall.seller.products.option_definitions.option_values.create(
      sellerConnection,
      {
        productId: product.id,
        optionDefinitionId: optionDefinition.id,
        body: {
          name: "Red",
        } satisfies IShoppingMallProductOptionValue.ICreate,
      },
    );
  typia.assert(optionValue);
  // Create product variant
  const variant =
    await api.functional.shoppingMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          price_override: null,
          option_value_ids: [optionValue.id],
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 2. Create Customer A (will attempt unauthorized update)
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerAAuth = await authorize_customer_join(customerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customerAAuth);
  // 3. Create Customer B (cart item owner)
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerBAuth = await authorize_customer_join(customerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customerBAuth);
  // 4. Add product variant to Customer A's cart
  const customerACartItem =
    await api.functional.shoppingMall.customer.cart.items.create(
      customerAConnection,
      {
        body: {
          shopping_mall_product_variant_id: variant.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(customerACartItem);
  // 5. Add product variant to Customer B's cart
  const customerBCartItem =
    await api.functional.shoppingMall.customer.cart.items.create(
      customerBConnection,
      {
        body: {
          shopping_mall_product_variant_id: variant.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(customerBCartItem);
  // Verify cart items belong to different customers
  TestValidator.notEquals(
    "Cart items belong to different customers",
    customerACartItem.cart.customer.id,
    customerBCartItem.cart.customer.id,
  );
  // 6. Customer A attempts to update Customer B's cart item (should fail with 403)
  await TestValidator.error(
    "Customer A cannot update Customer B's cart item - authorization rejected",
    async () => {
      await api.functional.shoppingMall.customer.cart.items.putByItemid(
        customerAConnection,
        {
          itemId: customerBCartItem.id,
          body: {
            quantity: 10,
          } satisfies IShoppingMallCartItem.IUpdate,
        },
      );
    },
  );
  // 7. Verify Customer B can still update their own cart item (positive test)
  const updatedCartItem =
    await api.functional.shoppingMall.customer.cart.items.putByItemid(
      customerBConnection,
      {
        itemId: customerBCartItem.id,
        body: {
          quantity: customerBCartItem.quantity + 1,
        } satisfies IShoppingMallCartItem.IUpdate,
      },
    );
  typia.assert(updatedCartItem);
  // Verify the quantity was actually updated
  TestValidator.equals(
    "Customer B's cart item quantity updated successfully",
    updatedCartItem.quantity,
    customerBCartItem.quantity + 1,
  );
  // Verify cart ownership is preserved after update
  TestValidator.equals(
    "Cart ownership preserved after update",
    updatedCartItem.cart.customer.id,
    customerBCartItem.cart.customer.id,
  );
}
