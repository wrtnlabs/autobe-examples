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
 * Test cart item quantity update functionality.
 * 1. Seller creates product with variants
 * 2. Customer joins and adds variant to cart
 * 3. Customer updates cart item quantity (increase: 1 to 3)
 * 4. Validate quantity updated, timestamp refreshed, price preserved
 * 5. Customer updates cart item quantity (decrease: 3 to 2)
 * 6. Validate quantity updated correctly
 */
export async function test_api_cart_item_quantity_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - create product with variants
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);
  // Create product
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
  // Create variant
  const variant =
    await api.functional.shoppingMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sku_code: RandomGenerator.alphaNumeric(10),
          price_override: null,
          option_value_ids: [optionValue.id],
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 2. Customer setup - join and login
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 3. Add variant to cart with initial quantity of 1
  const cartItem = await api.functional.shoppingMall.customer.cart.items.create(
    customerConnection,
    {
      body: {
        shopping_mall_product_variant_id: variant.id,
        quantity: 1,
      } satisfies IShoppingMallCartItem.ICreate,
    },
  );
  typia.assert(cartItem);
  // Store original price and created_at for validation
  const originalPrice = cartItem.price;
  const originalCreatedAt = cartItem.created_at;
  // 4. Update quantity - increase from 1 to 3
  const updatedCartItemIncrease =
    await api.functional.shoppingMall.customer.cart.items.putByItemid(
      customerConnection,
      {
        itemId: cartItem.id,
        body: {
          quantity: 3,
        } satisfies IShoppingMallCartItem.IUpdate,
      },
    );
  typia.assert(updatedCartItemIncrease);
  // Validate quantity increase
  TestValidator.equals(
    "quantity increased to 3",
    updatedCartItemIncrease.quantity,
    3,
  );
  TestValidator.notEquals(
    "updated_at refreshed on increase",
    updatedCartItemIncrease.updated_at,
    cartItem.updated_at,
  );
  TestValidator.equals(
    "price snapshot preserved on increase",
    updatedCartItemIncrease.price,
    originalPrice,
  );
  TestValidator.equals(
    "created_at unchanged on increase",
    updatedCartItemIncrease.created_at,
    originalCreatedAt,
  );
  // 5. Update quantity - decrease from 3 to 2
  const updatedCartItemDecrease =
    await api.functional.shoppingMall.customer.cart.items.putByItemid(
      customerConnection,
      {
        itemId: cartItem.id,
        body: {
          quantity: 2,
        } satisfies IShoppingMallCartItem.IUpdate,
      },
    );
  typia.assert(updatedCartItemDecrease);
  // Validate quantity decrease
  TestValidator.equals(
    "quantity decreased to 2",
    updatedCartItemDecrease.quantity,
    2,
  );
  TestValidator.notEquals(
    "updated_at refreshed on decrease",
    updatedCartItemDecrease.updated_at,
    updatedCartItemIncrease.updated_at,
  );
  TestValidator.equals(
    "price snapshot preserved on decrease",
    updatedCartItemDecrease.price,
    originalPrice,
  );
  TestValidator.equals(
    "created_at unchanged on decrease",
    updatedCartItemDecrease.created_at,
    originalCreatedAt,
  );
}
