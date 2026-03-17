import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallOrderItemVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemVariantSnapshot";
import type { IEcommerceMallOrderItemVariantSnapshotAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemVariantSnapshotAttribute";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentDelivery";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_customer_checkout_create } from "../../../generate/generate_random_ecommerce_mall_customer_checkout_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";

export async function test_api_order_item_variant_snapshot_immutability_after_variant_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account for category creation and later snapshot retrieval
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // 2. Create seller account for product and variant management
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 3. Create customer account for purchase
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // 4. Admin creates category required for product creation
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 5. Seller creates product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        categoryId: category.id,
      },
    },
  );
  typia.assert(product);
  // 6. Seller creates product variant with specific values
  const originalPrice = 100.0;
  const originalSkuCode = RandomGenerator.alphaNumeric(6);
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: originalSkuCode,
          price: originalPrice,
          options: [
            { optionName: "Color", optionValue: "Red" },
            { optionName: "Size", optionValue: "Large" },
          ] satisfies IEcommerceMallProductVariantOption.ICreate[],
          stock: 10,
        },
      },
    );
  typia.assert(variant);
  // Record original values for later validation
  const originalSku = variant.skuCode;
  const originalVariantPrice = variant.price;
  const originalOptions = variant.optionValues.map((opt) => ({
    optionName: opt.optionName,
    optionValue: opt.optionValue,
  }));
  // 7. Customer adds variant to cart
  const cartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: variant.id,
          quantity: 2,
        },
      },
    );
  typia.assert(cartItem);
  // 8. Customer completes checkout to generate order and variant snapshot
  const order = await generate_random_ecommerce_mall_customer_checkout_create(
    customerConnection,
    {
      body: {
        recipientName: RandomGenerator.name(),
        recipientPhone: RandomGenerator.mobile(),
        streetAddress: "123 Test Street",
        city: "Seoul",
        state: null,
        postalCode: "12345",
        country: "South Korea",
      } satisfies IEcommerceMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // Verify order was created with order items and variant snapshot
  TestValidator.predicate("order created", order.orderItems.length > 0);
  const orderId = order.id;
  const orderItem = order.orderItems[0] as IEcommerceMallOrderItem.ISummary;
  const orderItemId = orderItem.id;
  // Get the initial variant snapshot ID from order item
  // The variant snapshot is automatically created during checkout
  const initialSnapshotId = orderItem.variant.id;
  // 9. Seller updates product variant after order (change price and option values)
  const updatedPrice = 150.0;
  const updatedSkuCode = "UPDATED" + Date.now().toString().slice(-4);
  const updatedVariant =
    await api.functional.ecommerceMall.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          skuCode: updatedSkuCode,
          price: updatedPrice,
          optionValues: [
            { optionName: "Color", optionValue: "Blue" },
            { optionName: "Size", optionValue: "Small" },
          ] satisfies IEcommerceMallProductVariantOption.ICreate[],
        } satisfies IEcommerceMallProductVariant.IUpdate,
      },
    );
  typia.assert(updatedVariant);
  // Verify the variant was actually updated
  TestValidator.equals(
    "sku code updated",
    updatedVariant.skuCode,
    updatedSkuCode,
  );
  TestValidator.equals("price updated", updatedVariant.price, updatedPrice);
  TestValidator.predicate(
    "option values updated",
    updatedVariant.optionValues.some(
      (opt) => opt.optionName === "Color" && opt.optionValue === "Blue",
    ),
  );
  // 10. Admin retrieves variant snapshot to verify immutability
  // The snapshot should contain original values, not the updated ones
  const snapshot =
    await api.functional.ecommerceMall.admin.orders.items.variant.snapshots.at(
      adminConnection,
      {
        orderId: orderId,
        itemId: orderItemId,
        snapshotId: initialSnapshotId,
      },
    );
  typia.assert(snapshot);
  // 11. Validate snapshot immutability - should preserve original values
  TestValidator.equals(
    "snapshot preserves original SKU",
    snapshot.skuCode,
    originalSku,
  );
  TestValidator.equals(
    "snapshot preserves original price",
    snapshot.price,
    originalPrice,
  );
  TestValidator.predicate(
    "snapshot attributes exist",
    snapshot.attributes.length > 0,
  );
  // Verify option values in snapshot match original values (Color: Red, Size: Large)
  const colorAttribute = snapshot.attributes.find(
    (attr) => attr.optionKey === "Color",
  );
  const sizeAttribute = snapshot.attributes.find(
    (attr) => attr.optionKey === "Size",
  );
  TestValidator.equals(
    "snapshot preserves original Color option",
    colorAttribute?.optionValue,
    "Red",
  );
  TestValidator.equals(
    "snapshot preserves original Size option",
    sizeAttribute?.optionValue,
    "Large",
  );
  // Verify snapshot timestamp exists (immutable evidence)
  TestValidator.predicate(
    "snapshot has creation timestamp",
    !Number.isNaN(new Date(snapshot.createdAt).getTime()),
  );
}
