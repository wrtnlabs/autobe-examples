import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCheckoutConfirm } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckoutConfirm";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
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
import { generate_random_ecommerce_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_inventory_create";
import { generate_random_ecommerce_mall_seller_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

/**
 * Test that adding order items from a different seller is rejected.
 *
 * This test validates the single-seller shipment rule enforcement where each
 * shipment can only contain items from exactly one seller. The seller attempts
 * to add order items that belong to a different seller to their shipment.
 * The system should return a 400 error indicating that items must belong to
 * the same seller as the shipment.
 *
 * Test flow:
 * 1. Seller 1 (shipment owner) joins and logs in
 * 2. Seller 2 (items owner) joins, logs in, creates product with inventory
 * 3. Customer joins, adds product to cart, and checks out (creates order items for seller 2)
 * 4. Seller 1 creates their own shipment
 * 5. Seller 1 attempts to add seller 2's order items to their shipment
 * 6. System rejects with 400 error
 */
export async function test_api_shipment_add_items_rejects_different_seller_items(
  connection: api.IConnection,
): Promise<void> {
  // ============================================================
  // Step 1: Seller 1 (shipment owner) registration and login
  // ============================================================
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1JoinResult = await authorize_seller_join(seller1Connection, {});
  await authorize_seller_login(seller1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // ============================================================
  // Step 2: Seller 2 (items owner) registration, login, and product setup
  // ============================================================
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2JoinResult = await authorize_seller_join(seller2Connection, {});
  // Login as seller 2
  await authorize_seller_login(seller2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // Create product for seller 2
  const product = await generate_random_ecommerce_mall_seller_products_create(
    seller2Connection,
    {},
  );
  // Get the first variant from the product
  const variant = product.variants[0];
  // Add inventory to the variant
  await generate_random_ecommerce_mall_seller_products_variants_inventory_create(
    seller2Connection,
    {
      params: {
        productId: product.id,
        variantId: variant.id,
      },
    },
  );
  // ============================================================
  // Step 3: Customer joins, adds product to cart, and checks out
  // ============================================================
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // Add product variant to cart
  await generate_random_ecommerce_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        variant_id: variant.id,
        quantity: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
      },
    },
  );
  // Checkout to create paid order items
  const order =
    await api.functional.ecommerceMall.customer.checkout.confirm.create(
      customerConnection,
      {
        body: {
          payment_token: "test_payment_token",
        } satisfies IEcommerceMallCheckoutConfirm.IRequest,
      },
    );
  typia.assert(order);
  // Get the order item that belongs to seller 2
  const orderItemFromSeller2 = order.orderItems.find(
    (item) => item.productSnapshot.seller.id === seller2JoinResult.id,
  )!;
  TestValidator.equals(
    "order item belongs to seller 2",
    orderItemFromSeller2 !== null,
    true,
  );
  TestValidator.equals(
    "order item status is paid",
    orderItemFromSeller2.status,
    "paid",
  );
  // ============================================================
  // Step 4: Seller 1 creates their own shipment
  // (We need at least one order item belonging to seller 1 to create a shipment)
  // For this test, we'll create a simple shipment scenario
  // ============================================================
  // First, we need an order with items belonging to seller 1
  // Let's create another product by seller 1 and have customer buy it
  const product2 = await generate_random_ecommerce_mall_seller_products_create(
    seller1Connection,
    {},
  );
  const variant2 = product2.variants[0];
  await generate_random_ecommerce_mall_seller_products_variants_inventory_create(
    seller1Connection,
    {
      params: {
        productId: product2.id,
        variantId: variant2.id,
      },
    },
  );
  // Customer adds seller 1's product to cart and checks out
  await generate_random_ecommerce_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        variant_id: variant2.id,
        quantity: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
      },
    },
  );
  const order2 =
    await api.functional.ecommerceMall.customer.checkout.confirm.create(
      customerConnection,
      {
        body: {
          payment_token: "test_payment_token_2",
        } satisfies IEcommerceMallCheckoutConfirm.IRequest,
      },
    );
  typia.assert(order2);
  // Find order item belonging to seller 1
  const orderItemFromSeller1 = order2.orderItems.find(
    (item) => item.productSnapshot.seller.id === seller1JoinResult.id,
  )!;
  TestValidator.equals(
    "order item belongs to seller 1",
    orderItemFromSeller1 !== null,
    true,
  );
  // Seller 1 creates a shipment with their own order item
  const shipment = await generate_random_ecommerce_mall_seller_shipments_create(
    seller1Connection,
    {
      body: {
        orderId: order2.id,
        orderItemIds: [orderItemFromSeller1.id],
        carrier: "DHL",
        trackingNumber: "DHL123456789",
      },
    },
  );
  typia.assert(shipment);
  TestValidator.equals(
    "shipment belongs to seller 1",
    shipment.seller.id,
    seller1JoinResult.id,
  );
  // ============================================================
  // Step 5: Seller 1 attempts to add seller 2's order items to their shipment
  // This should fail with a 400 error because items must belong to the same seller
  // ============================================================
  await TestValidator.error(
    "adding items from different seller should be rejected",
    async () => {
      await api.functional.ecommerceMall.seller.shipments.items.update(
        seller1Connection,
        {
          shipmentId: shipment.id,
          body: {
            order_item_ids: [orderItemFromSeller2.id],
          } satisfies IEcommerceMallShipmentItem.IAdd,
        },
      );
    },
  );
}
