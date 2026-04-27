import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCartItem";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallInventoryRecord";
import type { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import type { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
import type { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import type { IECommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductImage";
import type { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import type { IECommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariantOption";
import type { IECommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallReview";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
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
import { generate_random_e_commerce_mall_customer_cart_items_create } from "../../../generate/generate_random_e_commerce_mall_customer_cart_items_create";
import { generate_random_e_commerce_mall_seller_products_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_create";
import { generate_random_e_commerce_mall_seller_products_variants_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_variants_create";
import { generate_random_e_commerce_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_variants_inventory_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

export async function test_api_cart_add_variant_success(
  connection: api.IConnection,
): Promise<void> {
  // ================================================================
  // PREREQUISITES
  // ================================================================
  // 1. Register and authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuthorized);
  // 2. Create a product with a category_id of null (uncategorized)
  const product = await generate_random_e_commerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        base_price: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1000>
        >(),
        category_id: null,
      },
    },
  );
  typia.assert(product);
  // 3. Create a variant with a price override and a color option
  const variantCreateBody = {
    sku_code: RandomGenerator.alphaNumeric(12),
    options: [
      {
        key: "color",
        value: RandomGenerator.alphabets(5),
      } satisfies IECommerceMallProductVariant.IOption,
    ],
    price: typia.random<number & tags.Type<"int32"> & tags.Minimum<1000>>(),
  } satisfies IECommerceMallProductVariant.ICreate;
  const variant =
    await generate_random_e_commerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        body: variantCreateBody,
        params: {
          productId: product.id,
        },
      },
    );
  typia.assert(variant);
  // 4. Add inventory stock so the variant is available for purchase
  const inventoryRecord =
    await generate_random_e_commerce_mall_seller_products_variants_inventory_create(
      sellerConnection,
      {
        body: {
          quantity_change: 100,
          reason: "Initial stock",
        },
        params: {
          productId: product.id,
          variantId: variant.id,
        },
      },
    );
  typia.assert(inventoryRecord);
  // 5. Register and authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuthorized = await authorize_customer_join(
    customerConnection,
    {},
  );
  typia.assert(customerAuthorized);
  // ================================================================
  // ACT: Add variant to cart for the first time
  // ================================================================
  const quantity = 2 satisfies number &
    tags.Type<"int32"> &
    tags.Minimum<1> as number;
  const cartItem =
    await api.functional.eCommerceMall.customer.cart_items.create(
      customerConnection,
      {
        body: {
          product_variant_id: variant.id,
          quantity,
        } satisfies IECommerceMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);
  // ================================================================
  // ASSERT: Validate cart item response
  // ================================================================
  // Effective unit price: variant.price (non-null override we set) ?? product.base_price
  TestValidator.equals("quantity", cartItem.quantity, quantity);
  TestValidator.equals("unit_price", cartItem.unit_price, variant.price!);
  TestValidator.equals(
    "subtotal",
    cartItem.subtotal,
    cartItem.unit_price * cartItem.quantity,
  );
  TestValidator.equals("is_available", cartItem.is_available, true);
  TestValidator.equals("deleted_at", cartItem.deleted_at, null);
  // Customer reference matches the authenticated customer
  TestValidator.equals(
    "customer id",
    cartItem.customer.id,
    customerAuthorized.id,
  );
  // ProductVariant reference matches the created variant
  TestValidator.equals("variant id", cartItem.productVariant.id, variant.id);
  TestValidator.equals(
    "variant SKU",
    cartItem.productVariant.sku_code,
    variant.sku_code,
  );
  // Verify the option we created is present
  const expectedOptionKey = variantCreateBody.options[0].key;
  const expectedOptionValue = variantCreateBody.options[0].value;
  const matchingOption = cartItem.productVariant.options.find(
    (o) => o.key === expectedOptionKey && o.value === expectedOptionValue,
  );
  TestValidator.predicate(
    "variant option (color) present with correct value",
    matchingOption !== undefined,
  );
  // Timestamps are non-empty strings (typia.assert already validated format)
  TestValidator.predicate(
    "created_at is present",
    typeof cartItem.created_at === "string" && cartItem.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is present",
    typeof cartItem.updated_at === "string" && cartItem.updated_at.length > 0,
  );
}
