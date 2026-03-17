import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
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

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_customer_cart_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_create";
import { generate_random_ecommerce_mall_customer_checkout_create } from "../../../generate/generate_random_ecommerce_mall_customer_checkout_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { generate_random_ecommerce_mall_seller_variants_inventory_create } from "../../../generate/generate_random_ecommerce_mall_seller_variants_inventory_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";

/**
 * Verify that order item snapshots preserve historical data for audit trail and dispute resolution purposes.
 *
 * Test Steps:
 * 1. Register as a seller
 * 2. Create a product
 * 3. Create a product variant
 * 4. Add inventory to enable checkout
 * 5. Register as a customer
 * 6. Add the product variant to cart
 * 7. Complete checkout (creates order with immutable snapshots)
 * 8. Retrieve the order item from the order
 * 9. Retrieve the specific snapshot using GET endpoint
 * 10. Validate snapshot contains seller profile data as it existed at purchase time
 * 11. Validate snapshot contains product data as it existed at purchase time
 * 12. Validate snapshot contains variant data as it existed at purchase time
 * 13. Verify snapshot immutability markers (id and createdAt)
 */
export async function test_api_order_item_snapshot_historical_integrity(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register as a seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/seller/join",
      referrer: "https://example.com",
      ip: null,
    },
  });
  typia.assert(seller);
  // Step 2: Create a product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        categoryId: typia.random<string & tags.Format<"uuid">>(),
        basePrice: typia.random<number & tags.Minimum<1>>(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // Step 3: Create a product variant
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `SKU-${typia.random<string & tags.Format<"uuid">>().slice(0, 8)}`,
          options: [
            {
              optionName: "Color",
              optionValue: "Red",
            },
            {
              optionName: "Size",
              optionValue: "Large",
            },
          ] satisfies Array<IEcommerceMallProductVariantOption.ICreate>,
          price: typia.random<number & tags.Minimum<1>>() satisfies number as number,
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // Step 4: Add inventory to enable checkout
  const inventory =
    await generate_random_ecommerce_mall_seller_variants_inventory_create(
      sellerConnection,
      {
        params: { variantId: variant.id },
        body: {
          quantity: 50,
          reason: "Initial stock restocking for test",
        } satisfies IEcommerceMallInventoryRecord.ICreate,
      },
    );
  typia.assert(inventory);
  // Step 5: Register as a customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(customer);
  // Step 6: Add the product variant to cart
  const cartItem = await generate_random_ecommerce_mall_customer_cart_create(
    customerConnection,
    {
      body: {
        productVariantId: variant.id,
        quantity: 2,
      } satisfies IEcommerceMallCartItem.ICreate,
    },
  );
  typia.assert(cartItem);
  // Step 7: Complete checkout (creates order with immutable snapshots)
  const order = await generate_random_ecommerce_mall_customer_checkout_create(
    customerConnection,
    {
      body: {
        recipientName: RandomGenerator.name(2),
        recipientPhone: RandomGenerator.mobile(),
        streetAddress: "123 Test Street",
        city: "Test City",
        state: "TS",
        postalCode: "12345",
        country: "Test Country",
      } satisfies IEcommerceMallOrder.ICreate,
    },
  );
  typia.assert(order);
  TestValidator.predicate(
    "order has at least one item",
    order.orderItems.length > 0,
  );
  // Step 8: Get order item details from the created order
  const orderItem = order.orderItems[0] as IEcommerceMallOrderItem & IEntity;
  typia.assert(orderItem);
  // Step 9 & 10: Retrieve the specific snapshot
  const snapshot =
    await api.functional.ecommerceMall.seller.orders.items.snapshots.at(
      sellerConnection,
      {
        orderId: order.id,
        itemId: orderItem.id,
        snapshotId: orderItem.id,
      },
    );
  typia.assert(snapshot);
  // Step 11: Validate seller snapshot contains shop profile as it existed at purchase time
  TestValidator.predicate(
    "seller snapshot exists",
    snapshot.sellerSnapshot !== null,
  );
  TestValidator.equals(
    "seller snapshot has shop name",
    typeof snapshot.sellerSnapshot.shopName,
    "string",
  );
  TestValidator.predicate(
    "seller snapshot shopName is non-empty",
    snapshot.sellerSnapshot.shopName.length > 0,
  );
  TestValidator.equals(
    "seller snapshot has valid ID type",
    typeof snapshot.sellerSnapshot.id,
    "string",
  );
  TestValidator.predicate(
    "seller snapshot ID is non-empty",
    snapshot.sellerSnapshot.id.length > 0,
  );
  TestValidator.equals(
    "seller snapshot has created timestamp",
    typeof snapshot.sellerSnapshot.createdAt,
    "string",
  );
  // Step 12: Validate product snapshot contains product details as they existed at purchase time
  TestValidator.predicate(
    "product snapshot exists",
    snapshot.productSnapshot !== null,
  );
  TestValidator.equals(
    "product snapshot has name",
    typeof snapshot.productSnapshot.name,
    "string",
  );
  TestValidator.predicate(
    "product snapshot name is non-empty",
    snapshot.productSnapshot.name.length > 0,
  );
  TestValidator.equals(
    "product snapshot has description",
    typeof snapshot.productSnapshot.description,
    "string",
  );
  TestValidator.equals(
    "product snapshot has base price",
    typeof snapshot.productSnapshot.base_price,
    "number",
  );
  TestValidator.equals(
    "product snapshot has valid ID type",
    typeof snapshot.productSnapshot.id,
    "string",
  );
  TestValidator.predicate(
    "product snapshot ID is non-empty",
    snapshot.productSnapshot.id.length > 0,
  );
  // Step 13: Validate variant snapshot contains variant details as they existed at purchase time
  TestValidator.predicate(
    "variant snapshot exists",
    snapshot.variantSnapshot !== null,
  );
  TestValidator.equals(
    "variant snapshot has SKU code",
    typeof snapshot.variantSnapshot.skuCode,
    "string",
  );
  TestValidator.predicate(
    "variant snapshot skuCode is non-empty",
    snapshot.variantSnapshot.skuCode.length > 0,
  );
  TestValidator.equals(
    "variant snapshot has price",
    typeof snapshot.variantSnapshot.price,
    "number",
  );
  TestValidator.predicate(
    "variant snapshot has attributes array",
    Array.isArray(snapshot.variantSnapshot.attributes),
  );
  TestValidator.equals(
    "variant snapshot has valid ID type",
    typeof snapshot.variantSnapshot.id,
    "string",
  );
  TestValidator.predicate(
    "variant snapshot ID is non-empty",
    snapshot.variantSnapshot.id.length > 0,
  );
  TestValidator.equals(
    "variant snapshot has created timestamp",
    typeof snapshot.variantSnapshot.createdAt,
    "string",
  );
  // Step 14: Verify snapshot immutability markers
  TestValidator.equals("snapshot has valid ID", typeof snapshot.id, "string");
  TestValidator.predicate("snapshot ID is non-empty", snapshot.id.length > 0);
  TestValidator.equals(
    "snapshot has created timestamp",
    typeof snapshot.createdAt,
    "string",
  );
  TestValidator.equals(
    "snapshot orderItemId matches",
    snapshot.orderItemId,
    orderItem.id,
  );
}