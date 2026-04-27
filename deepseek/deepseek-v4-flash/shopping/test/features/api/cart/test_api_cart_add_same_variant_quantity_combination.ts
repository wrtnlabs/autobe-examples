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

export async function test_api_cart_add_same_variant_quantity_combination(
  connection: api.IConnection,
): Promise<void> {
  //---------------------------------------------------
  // Preparation: Seller creates product with variant
  //---------------------------------------------------
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerJoin);
  // Create product
  const product = await generate_random_e_commerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // Create variant under the product
  const variant =
    await generate_random_e_commerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
      },
    );
  typia.assert(variant);
  // Restock variant with 100 units
  const inventory =
    await generate_random_e_commerce_mall_seller_products_variants_inventory_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
          variantId: variant.id,
        },
      },
    );
  typia.assert(inventory);
  //---------------------------------------------------
  // Preparation: Customer setup
  //---------------------------------------------------
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoin = await authorize_customer_join(customerConnection, {});
  typia.assert(customerJoin);
  //---------------------------------------------------
  // Step 1: First cart add — quantity 2
  //---------------------------------------------------
  const firstCartItem =
    await api.functional.eCommerceMall.customer.cart_items.create(
      customerConnection,
      {
        body: {
          product_variant_id: variant.id,
          quantity: 2,
        } satisfies IECommerceMallCartItem.ICreate,
      },
    );
  typia.assert(firstCartItem);
  TestValidator.equals("first cart item quantity", firstCartItem.quantity, 2);
  TestValidator.equals(
    "first cart item variant id",
    firstCartItem.productVariant.id,
    variant.id,
  );
  const firstId: string = firstCartItem.id;
  const firstCreatedAt: string = firstCartItem.created_at;
  const firstUpdatedAt: string = firstCartItem.updated_at;
  const firstUnitPrice: number = firstCartItem.unit_price;
  //---------------------------------------------------
  // Step 2: Second cart add — same variant, quantity 3
  //---------------------------------------------------
  const secondCartItem =
    await api.functional.eCommerceMall.customer.cart_items.create(
      customerConnection,
      {
        body: {
          product_variant_id: variant.id,
          quantity: 3,
        } satisfies IECommerceMallCartItem.ICreate,
      },
    );
  typia.assert(secondCartItem);
  // Validate: same id (not a new record)
  TestValidator.equals("cart item id preserved", secondCartItem.id, firstId);
  // Validate: quantity combined (2 + 3 = 5)
  TestValidator.equals("quantity combined", secondCartItem.quantity, 5);
  // Validate: created_at unchanged
  TestValidator.equals(
    "created_at preserved",
    secondCartItem.created_at,
    firstCreatedAt,
  );
  // Validate: updated_at refreshed (later than first update)
  TestValidator.predicate(
    "updated_at refreshed",
    new Date(secondCartItem.updated_at).getTime() >
      new Date(firstUpdatedAt).getTime(),
  );
  // Validate: unit_price unchanged
  TestValidator.equals(
    "unit_price preserved",
    secondCartItem.unit_price,
    firstUnitPrice,
  );
  // Validate: subtotal = unit_price * 5
  TestValidator.equals(
    "subtotal correct",
    secondCartItem.subtotal,
    secondCartItem.unit_price * secondCartItem.quantity,
  );
}
