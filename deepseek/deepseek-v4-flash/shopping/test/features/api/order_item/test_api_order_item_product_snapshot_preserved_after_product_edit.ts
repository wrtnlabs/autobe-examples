import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCancellationRequest";
import type { IECommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCancellationRequestSnapshot";
import type { IECommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCartItem";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallInventoryRecord";
import type { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import type { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
import type { IECommerceMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemSellerSnapshot";
import type { IECommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemSnapshot";
import type { IECommerceMallOrderItemStatusLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemStatusLog";
import type { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import type { IECommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductImage";
import type { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import type { IECommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariantOption";
import type { IECommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallRefundRequest";
import type { IECommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallRefundRequestSnapshot";
import type { IECommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallReview";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import type { IECommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallShipment";
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
import { generate_random_e_commerce_mall_customer_orders_create } from "../../../generate/generate_random_e_commerce_mall_customer_orders_create";
import { generate_random_e_commerce_mall_seller_products_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_create";
import { generate_random_e_commerce_mall_seller_products_variants_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_variants_create";
import { generate_random_e_commerce_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_variants_inventory_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

export async function test_api_order_item_product_snapshot_preserved_after_product_edit(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 3. Seller creates a product with SPECIFIC INITIAL values
  const originalName = RandomGenerator.paragraph({ sentences: 2 });
  const originalDescription = RandomGenerator.content({ paragraphs: 2 });
  const originalBasePrice = typia.random<
    number & tags.Minimum<1000> & tags.Maximum<100000>
  >();
  const product = await generate_random_e_commerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: originalName,
        description: originalDescription,
        base_price: originalBasePrice,
        category_id: null,
      },
    },
  );
  typia.assert(product);
  // 4. Seller creates a variant with SPECIFIC INITIAL values
  const originalSku = RandomGenerator.alphaNumeric(10);
  const originalVariantPrice = typia.random<
    number & tags.Minimum<1000> & tags.Maximum<100000>
  >();
  const variant =
    await generate_random_e_commerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          sku_code: originalSku,
          price: originalVariantPrice,
          options: [
            { key: "color", value: "Red" },
            { key: "size", value: "M" },
          ],
        },
        params: {
          productId: product.id,
        },
      },
    );
  typia.assert(variant);
  // 5. Seller adds stock to the variant
  const initialStock = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<5> & tags.Maximum<50>
  >();
  const inventoryRecord =
    await generate_random_e_commerce_mall_seller_products_variants_inventory_create(
      sellerConnection,
      {
        body: {
          quantity_change: initialStock,
          reason: "Initial restock for test",
        },
        params: {
          productId: product.id,
          variantId: variant.id,
        },
      },
    );
  typia.assert(inventoryRecord);
  // 6. Customer adds the variant to cart
  const cartItem =
    await generate_random_e_commerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          product_variant_id: variant.id,
          quantity: 1,
        },
      },
    );
  typia.assert(cartItem);
  // 7. Customer places the order (snapshot IS CREATED HERE)
  const order = await generate_random_e_commerce_mall_customer_orders_create(
    customerConnection,
    {},
  );
  typia.assert(order);
  // Extract the order item ID from the created order
  const orderItemId = order.orderItems[0].id;
  // 8. Seller edits the product — changing name, description, and base_price
  const updatedName = RandomGenerator.paragraph({ sentences: 2 });
  const updatedDescription = RandomGenerator.content({ paragraphs: 2 });
  const updatedBasePrice =
    originalBasePrice +
    typia.random<number & tags.Minimum<10000> & tags.Maximum<50000>>();
  // Ensure updated values are DIFFERENT from original
  const effectiveUpdatedName =
    originalName !== updatedName ? updatedName : updatedName + " (EDITED)";
  const effectiveUpdatedDescription =
    originalDescription !== updatedDescription
      ? updatedDescription
      : updatedDescription + " (EDITED)";
  const effectiveUpdatedBasePrice =
    updatedBasePrice !== originalBasePrice
      ? updatedBasePrice
      : updatedBasePrice + 99999;
  const updatedProduct =
    await api.functional.eCommerceMall.seller.products.update(
      sellerConnection,
      {
        productId: product.id,
        body: {
          name: effectiveUpdatedName,
          description: effectiveUpdatedDescription,
          base_price: effectiveUpdatedBasePrice,
        },
      },
    );
  typia.assert(updatedProduct);
  // 9. Customer retrieves the product-variant snapshot for the order item
  const snapshot =
    await api.functional.eCommerceMall.customer.order_items.product_snapshot.at(
      customerConnection,
      {
        itemId: orderItemId,
      },
    );
  typia.assert(snapshot);
  // 10. VALIDATE: Snapshot contains ORIGINAL values, NOT updated values
  TestValidator.equals(
    "snapshot productName is original",
    snapshot.productName,
    originalName,
  );
  TestValidator.equals(
    "snapshot productDescription is original",
    snapshot.productDescription,
    originalDescription,
  );
  TestValidator.equals(
    "snapshot productBasePrice is original",
    snapshot.productBasePrice,
    originalBasePrice,
  );
  TestValidator.equals(
    "snapshot variantSku is original",
    snapshot.variantSku,
    originalSku,
  );
  TestValidator.equals(
    "snapshot variantPrice is original",
    snapshot.variantPrice,
    originalVariantPrice,
  );
  // 11. VALIDATE: Snapshot DIFFERS from updated values (proving historical preservation)
  TestValidator.notEquals(
    "snapshot name differs from updated",
    snapshot.productName,
    effectiveUpdatedName,
  );
  TestValidator.notEquals(
    "snapshot description differs from updated",
    snapshot.productDescription,
    effectiveUpdatedDescription,
  );
  TestValidator.notEquals(
    "snapshot basePrice differs from updated",
    snapshot.productBasePrice,
    effectiveUpdatedBasePrice,
  );
}
