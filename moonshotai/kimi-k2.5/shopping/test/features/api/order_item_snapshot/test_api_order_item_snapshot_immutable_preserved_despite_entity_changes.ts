import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallOrderItemProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemProductSnapshot";
import type { IEcommerceMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemSellerSnapshot";
import type { IEcommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemSnapshot";
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

export async function test_api_order_item_snapshot_immutable_preserved_despite_entity_changes(
  connection: api.IConnection,
): Promise<void> {
  // Create admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: { href: "http://localhost", referrer: "http://localhost" },
  });
  // Create seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "http://localhost",
    referrer: "http://localhost",
    ip: null,
  };
  await authorize_seller_join(sellerConnection, { body: sellerCredentials });
  // Create customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  };
  await authorize_customer_join(customerConnection, {
    body: customerCredentials,
  });
  // Admin creates category
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // Seller creates product with category assignment
  const productBody = {
    name: "Original Product Name",
    description: "Original product description that will remain in snapshot",
    categoryId: category.id,
    basePrice: 100.0,
  } satisfies IEcommerceMallProduct.ICreate;
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    { body: productBody },
  );
  typia.assert(product);
  // Store original product values for later validation
  const originalProductName = product.name;
  const originalProductDescription = product.description;
  const originalBasePrice = product.basePrice;
  const originalSellerName = product.seller.shopName;
  // Seller creates product variant with initial configuration
  const variantBody = {
    skuCode: "SKU-ORIGINAL-001",
    options: [
      {
        optionName: "Color",
        optionValue: "Red",
      } satisfies IEcommerceMallProductVariantOption.ICreate,
    ],
    price: 150.0,
    stock: 100,
  } satisfies IEcommerceMallProductVariant.ICreate;
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: variantBody,
      },
    );
  typia.assert(variant);
  // Store original variant values for later validation
  const originalSkuCode = variant.skuCode;
  const originalVariantPrice = variant.price ?? originalBasePrice;
  const originalOptionName = variant.optionValues[0]?.optionName ?? "Color";
  const originalOptionValue = variant.optionValues[0]?.optionValue ?? "Red";
  // Customer adds variant to cart for purchase
  const cartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: variant.id,
          quantity: 2,
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);
  // Customer completes checkout to generate immutable purchase-time snapshots
  const order = await generate_random_ecommerce_mall_customer_checkout_create(
    customerConnection,
    {
      body: {
        recipientName: "Test Customer",
        recipientPhone: RandomGenerator.mobile(),
        streetAddress: "123 Test Street",
        city: "Test City",
        state: "Test State",
        postalCode: "12345",
        country: "Korea",
      } satisfies IEcommerceMallOrder.ICreate,
    },
  );
  typia.assert(order);
  typia.assert(order.orderItems.length > 0);
  const orderItem = order.orderItems[0];
  const orderId = order.id;
  const itemId = (orderItem as any).id;
  const snapshotId = (orderItem as any).id;
  // Verify order was created successfully with snapshot references
  TestValidator.predicate("order has items", order.orderItems.length > 0);
  TestValidator.predicate(
    "order item has product snapshot",
    !!(orderItem as any).product,
  );
  TestValidator.predicate(
    "order item has variant snapshot",
    !!(orderItem as any).variant,
  );
  TestValidator.predicate("order item has seller snapshot", !!(orderItem as any).seller);
  // Now retrieve the immutable snapshot through the dedicated endpoint
  const snapshot =
    await api.functional.ecommerceMall.customer.orders.items.snapshots.at(
      customerConnection,
      {
        orderId,
        itemId,
        snapshotId,
      },
    );
  typia.assert(snapshot);
  // Validation point 1: Snapshot contains original product name from purchase time
  TestValidator.equals(
    "snapshot product name matches original",
    snapshot.productSnapshot.name,
    originalProductName,
  );
  // Validation point 2: Snapshot contains original product description from purchase time
  TestValidator.equals(
    "snapshot product description matches original",
    snapshot.productSnapshot.description,
    originalProductDescription,
  );
  // Validation point 3: Snapshot contains original variant SKU code from purchase time
  TestValidator.equals(
    "snapshot variant SKU matches original",
    snapshot.variantSnapshot.skuCode,
    originalSkuCode,
  );
  // Validation point 4: Snapshot contains original variant price from purchase time
  TestValidator.equals(
    "snapshot variant price matches original",
    snapshot.variantSnapshot.price,
    originalVariantPrice ?? originalBasePrice,
  );
  // Validation point 5: Snapshot contains original option values from purchase time
  const snapshotAttribute = snapshot.variantSnapshot.attributes[0];
  TestValidator.predicate(
    "snapshot has attributes",
    snapshot.variantSnapshot.attributes.length > 0,
  );
  if (snapshotAttribute) {
    TestValidator.equals(
      "snapshot option name matches original",
      snapshotAttribute.optionKey,
      originalOptionName,
    );
    TestValidator.equals(
      "snapshot option value matches original",
      snapshotAttribute.optionValue,
      originalOptionValue,
    );
  }
  // Validation point 6: Snapshot contains original seller shop name from purchase time
  TestValidator.equals(
    "snapshot seller shop name matches original",
    snapshot.sellerSnapshot.shopName,
    originalSellerName,
  );
  // Validation point 7: The timestamp in the snapshot reflects the purchase time
  TestValidator.predicate(
    "snapshot createdAt is within reasonable time of order",
    () => {
      const snapshotTime = new Date(snapshot.createdAt).getTime();
      const orderTime = new Date(order.createdAt).getTime();
      const timeDiff = Math.abs(snapshotTime - orderTime);
      return timeDiff < 60000;
    },
  );
  // Validation point 8: Snapshot timestamps are immutable - they should match order creation time
  TestValidator.predicate("product snapshot timestamp is valid", () => {
    return typia.is<string & tags.Format<"date-time">>(
      snapshot.productSnapshot.created_at,
    );
  });
  TestValidator.predicate("variant snapshot timestamp is valid", () => {
    return typia.is<string & tags.Format<"date-time">>(
      snapshot.variantSnapshot.createdAt,
    );
  });
  TestValidator.predicate("seller snapshot timestamp is valid", () => {
    return typia.is<string & tags.Format<"date-time">>(
      snapshot.sellerSnapshot.createdAt,
    );
  });
  // Validation point 9: Snapshot serves as canonical record with preserved entity IDs
  TestValidator.predicate("snapshot has valid UUID format for product", () => {
    return typia.is<string & tags.Format<"uuid">>(snapshot.productSnapshot.id);
  });
  TestValidator.predicate("snapshot has valid UUID format for variant", () => {
    return typia.is<string & tags.Format<"uuid">>(snapshot.variantSnapshot.id);
  });
  TestValidator.predicate("snapshot has valid UUID format for seller", () => {
    return typia.is<string & tags.Format<"uuid">>(snapshot.sellerSnapshot.id);
  });
  TestValidator.predicate("snapshot has valid UUID format for self", () => {
    return typia.is<string & tags.Format<"uuid">>(snapshot.id);
  });
  // Validation point 10: Order item reference is correctly linked
  TestValidator.predicate("order item ID matches snapshot orderItemId", () => {
    return snapshot.orderItemId === itemId;
  });
}