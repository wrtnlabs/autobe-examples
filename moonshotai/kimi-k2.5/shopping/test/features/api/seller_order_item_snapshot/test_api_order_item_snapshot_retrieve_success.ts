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
 * Verify a seller can successfully retrieve a specific order item snapshot for an order they fulfilled.
 * This test validates the primary business workflow where a seller accesses the immutable purchase-time
 * records of their fulfilled items.
 *
 * Test Steps:
 * 1. Register as a seller via POST /auth/seller/join
 * 2. Create a product via POST /seller/products
 * 3. Create a variant for the product via POST /seller/products/{productId}/variants
 * 4. Add inventory to the variant via POST /seller/variants/{variantId}/inventory
 * 5. Register as a customer via POST /auth/customer/join
 * 6. Add the product variant to cart via POST /customer/cart
 * 7. Complete checkout via POST /customer/checkout to create an order (automatically creates order items with snapshots)
 * 8. As seller, retrieve the specific order item snapshot using GET /seller/orders/{orderId}/items/{itemId}/snapshots/{snapshotId}
 * 9. Validate response contains complete snapshot data: productSnapshot, variantSnapshot, sellerSnapshot, and createdAt timestamp
 */
export async function test_api_order_item_snapshot_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
    },
  });
  // 2. Create a product
  const product: IEcommerceMallProduct =
    await generate_random_ecommerce_mall_seller_products_create(
      sellerConnection,
      { body: undefined },
    );
  // 3. Create a variant for the product
  const variant: IEcommerceMallProductVariant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {},
      },
    );
  // 4. Add inventory to the variant
  await generate_random_ecommerce_mall_seller_variants_inventory_create(
    sellerConnection,
    {
      params: { variantId: variant.id },
      body: {
        quantity: 100,
        reason: "Initial stock for testing",
      } satisfies DeepPartial<IEcommerceMallInventoryRecord.ICreate>,
    },
  );
  // 5. Register as customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {},
  });
  // 6. Add the product variant to cart
  await generate_random_ecommerce_mall_customer_cart_create(
    customerConnection,
    {
      body: {
        productVariantId: variant.id,
        quantity: 2,
      } satisfies DeepPartial<IEcommerceMallCartItem.ICreate>,
    },
  );
  // 7. Complete checkout to create an order with snapshots
  const order: IEcommerceMallOrder =
    await generate_random_ecommerce_mall_customer_checkout_create(
      customerConnection,
      {
        body: {
          recipientName: "Test Recipient",
          recipientPhone: "01012345678",
          streetAddress: "123 Test Street",
          city: "Seoul",
          state: null,
          postalCode: "12345",
          country: "KR",
        },
      },
    );
  typia.assert(order);
  // 8. Get order item and snapshot info from the created order
  const orderItem = typia.assert<IEcommerceMallOrderItem.ISummary>(
    order.orderItems[0],
  );
  // 9. As seller, retrieve the specific order item snapshot
  const snapshot: IEcommerceMallOrderItemSnapshot =
    await api.functional.ecommerceMall.seller.orders.items.snapshots.at(
      sellerConnection,
      {
        orderId: order.id,
        itemId: orderItem.id,
        snapshotId: orderItem.id,
      },
    );
  typia.assert(snapshot);
  // 10. Validate snapshot contains all required components
  TestValidator.equals(
    "snapshot orderItemId matches order item",
    snapshot.orderItemId,
    orderItem.id,
  );
  // 11. Validate nested snapshot data matches original product/variant state
  TestValidator.equals(
    "product name in snapshot matches original",
    snapshot.productSnapshot.name,
    product.name,
  );
  TestValidator.equals(
    "variant SKU in snapshot matches original",
    snapshot.variantSnapshot.skuCode,
    variant.skuCode,
  );
  TestValidator.equals(
    "seller snapshot has shop name",
    snapshot.sellerSnapshot.shopName,
    seller.shopName ?? "",
  );
}
