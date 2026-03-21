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

export async function test_api_shipment_delivery_confirmation_by_customer(
  connection: api.IConnection,
): Promise<void> {
  // Generate seller credentials
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  // 1. Seller joins
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "https://example.com/seller",
      referrer: "https://example.com",
    },
  });
  // 2. Seller logs in
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "https://example.com/seller",
      referrer: "https://example.com",
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // 3. Seller creates product with variant and inventory
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerLoginConnection,
    {},
  );
  typia.assert(product);
  // Get the variant from the product
  const variant = product.variants[0];
  TestValidator.equals("variant exists", variant !== undefined, true);
  // Add inventory to the variant
  const inventory =
    await generate_random_ecommerce_mall_seller_products_variants_inventory_create(
      sellerLoginConnection,
      {
        params: {
          productId: product.id,
          variantId: variant.id,
        },
        body: {
          operation: "restock" as const,
          quantity: 10 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          reason: "Initial stock for testing",
        },
      },
    );
  typia.assert(inventory);
  // Generate customer credentials
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  // 4. Customer joins
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: "https://example.com/customer",
      referrer: "https://example.com",
    },
  });
  // 5. Customer logs in
  const customerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerLoginConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: "https://example.com/customer",
      referrer: "https://example.com",
    } satisfies IEcommerceMallCustomer.ILogin,
  });
  // 6. Customer adds product to cart
  const cartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerLoginConnection,
      {
        body: {
          variant_id: variant.id,
          quantity: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        },
      },
    );
  typia.assert(cartItem);
  // 7. Customer creates order through checkout
  const order =
    await api.functional.ecommerceMall.customer.checkout.confirm.create(
      customerLoginConnection,
      {
        body: {
          payment_token: "test_payment_token_" + RandomGenerator.alphabets(8),
        } satisfies IEcommerceMallCheckoutConfirm.IRequest,
      },
    );
  typia.assert(order);
  // Get the order item ID and shipment ID
  const orderItemId = order.orderItems[0].id;
  const shipmentId = order.shipments[0].id;
  const orderId = order.id;
  TestValidator.equals(
    "order item has paid status",
    order.orderItems[0].status,
    "paid",
  );
  // 8. Seller creates shipment with tracking info
  const shipment = await generate_random_ecommerce_mall_seller_shipments_create(
    sellerLoginConnection,
    {
      body: {
        orderId: orderId,
        orderItemIds: [orderItemId] satisfies (string & tags.Format<"uuid">)[] &
          tags.MinItems<1>,
        carrier: "DHL Express",
        trackingNumber: "DHL123456789",
      } satisfies IEcommerceMallShipment.ICreate,
    },
  );
  typia.assert(shipment);
  TestValidator.equals(
    "shipment has tracking number",
    shipment.tracking_number,
    "DHL123456789",
  );
  // 9. Customer confirms delivery for the shipment
  const confirmedShipment =
    await api.functional.ecommerceMall.customer.orders.shipments.confirm_delivery.confirmDelivery(
      customerLoginConnection,
      {
        orderId: orderId,
        shipmentId: shipmentId,
      },
    );
  typia.assert(confirmedShipment);
  // 10. Verify response returns shipment with all order items in 'delivered' status
  TestValidator.equals(
    "shipment carrier preserved",
    confirmedShipment.carrier,
    "DHL Express",
  );
  TestValidator.equals(
    "shipment tracking number preserved",
    confirmedShipment.tracking_number,
    "DHL123456789",
  );
  TestValidator.equals(
    "order items in shipment are delivered",
    confirmedShipment.shipment_items[0].orderItem.status,
    "delivered",
  );
}