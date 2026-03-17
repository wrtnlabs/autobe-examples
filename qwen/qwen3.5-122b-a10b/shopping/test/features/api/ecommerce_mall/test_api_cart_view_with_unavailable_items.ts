import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { generate_random_ecommerce_mall_seller_variants_inventory_records_create } from "../../../generate/generate_random_ecommerce_mall_seller_variants_inventory_records_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

export async function test_api_cart_view_with_unavailable_items(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer joins the platform
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customer);
  // 2. Seller joins the platform
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller);
  // 3. Seller creates a product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 4. Seller creates variant 1 (will remain available)
  const variant1 =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: RandomGenerator.alphaNumeric(10),
          optionValues: [
            { key: "color", value: "Red" },
            { key: "size", value: "Large" },
          ],
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          stockQuantity: 10,
        },
      },
    );
  typia.assert(variant1);
  // 5. Seller creates variant 2 (will be marked out of stock)
  const variant2 =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: RandomGenerator.alphaNumeric(10),
          optionValues: [
            { key: "color", value: "Blue" },
            { key: "size", value: "Medium" },
          ],
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          stockQuantity: 10,
        },
      },
    );
  typia.assert(variant2);
  // 6. Customer adds variant 1 to cart (available item)
  const cartItem1 =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          product_variant_id: variant1.id,
          quantity: 2,
        },
      },
    );
  typia.assert(cartItem1);
  // 7. Customer adds variant 2 to cart (will become unavailable)
  const cartItem2 =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          product_variant_id: variant2.id,
          quantity: 3,
        },
      },
    );
  typia.assert(cartItem2);
  // 8. Seller reduces variant 2 stock to zero (marks as out of stock)
  await generate_random_ecommerce_mall_seller_variants_inventory_records_create(
    sellerConnection,
    {
      params: { variantId: variant2.id },
      body: {
        quantityChange: -10,
        reason: "inventory_adjustment",
      },
    },
  );
  // 9. Customer views cart and receives cart data with mixed availability status
  const cart =
    await api.functional.ecommerceMall.customer.cart.at(customerConnection);
  typia.assert(cart);
  // 10. Validate cart has both items
  TestValidator.equals("cart has 2 items", cart.items.length, 2);
  // 11. Find available and unavailable items
  const availableItem = cart.items.find((item) => item.is_available === true);
  const unavailableItem = cart.items.find(
    (item) => item.is_available === false,
  );
  // 12. Validate available item is variant 1
  TestValidator.equals(
    "available item is variant 1",
    availableItem?.product_variant.id,
    variant1.id,
  );
  TestValidator.predicate(
    "available item quantity > 0",
    availableItem?.quantity === 2,
  );
  // 13. Validate unavailable item is variant 2
  TestValidator.equals(
    "unavailable item is variant 2",
    unavailableItem?.product_variant.id,
    variant2.id,
  );
  TestValidator.predicate(
    "unavailable item quantity > 0",
    unavailableItem?.quantity === 3,
  );
  // 14. Validate cart total calculation excludes unavailable items
  const expectedTotal = availableItem?.subtotal ?? 0;
  TestValidator.equals(
    "cart total excludes unavailable items",
    cart.total,
    expectedTotal,
  );
  // 15. Validate unavailable item subtotal is not included in total
  if (unavailableItem) {
    TestValidator.notEquals(
      "unavailable item has subtotal",
      unavailableItem.subtotal,
      0,
    );
  }
}
