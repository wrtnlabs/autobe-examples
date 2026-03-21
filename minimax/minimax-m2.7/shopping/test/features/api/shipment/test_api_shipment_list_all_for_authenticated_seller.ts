import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
import type { IEcommerceMallCheckoutConfirm } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckoutConfirm";
import type { IEcommerceMallCheckoutPrepareItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckoutPrepareItem";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShipment";
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
import { generate_random_ecommerce_mall_seller_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

export async function test_api_shipment_list_all_for_authenticated_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller account and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Register customer account and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  const customerId = customerAuth.id;
  // 3. Create a product with variant via seller
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // Find a variant from the product to add to cart
  const variant = product.variants[0];
  TestValidator.equals(
    "product has variants",
    product.variants.length > 0,
    true,
  );
  // 4. Customer adds item to cart
  const cartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          variant_id: variant.id,
          quantity: 1,
        },
      },
    );
  typia.assert(cartItem);
  // 5. Prepare checkout
  const checkoutPrepare =
    await api.functional.ecommerceMall.customer.checkout.prepare(
      customerConnection,
    );
  typia.assert(checkoutPrepare);
  // 6. Complete checkout (place order)
  const order =
    await api.functional.ecommerceMall.customer.checkout.confirm.create(
      customerConnection,
      {
        body: {
          payment_token: "test_payment_token",
        },
      },
    );
  typia.assert(order);
  // Get the seller ID from the product
  const sellerId = product.seller.seller.id;
  // Extract order item belonging to this seller
  const sellerOrderItems = order.orderItems.filter(
    (item) => item.productSnapshot.seller.id === sellerId,
  );
  // 7. Create shipment for seller's order items
  const shipment = await generate_random_ecommerce_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        orderId: order.id,
        orderItemIds: sellerOrderItems.map((item) => item.id),
        carrier: "DHL Express",
        trackingNumber: "1234567890",
      },
    },
  );
  typia.assert(shipment);
  // 8. List all shipments for the authenticated seller
  const shipmentsList =
    await api.functional.ecommerceMall.seller.shipments.index(
      sellerConnection,
      {
        body: {},
      },
    );
  typia.assert(shipmentsList);
  // Verify pagination metadata exists
  TestValidator.equals(
    "has pagination data",
    shipmentsList.pagination !== undefined,
    true,
  );
  TestValidator.predicate(
    "pagination has current",
    shipmentsList.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has limit",
    shipmentsList.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination has records",
    shipmentsList.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pagination has pages",
    shipmentsList.pagination.pages >= 1,
  );
  // Verify shipments array exists and has at least 1 shipment
  TestValidator.predicate("has shipments", shipmentsList.data.length >= 1);
  // Verify each shipment has required fields
  const createdShipment = shipmentsList.data.find((s) => s.id === shipment.id);
  TestValidator.equals(
    "found created shipment",
    createdShipment !== undefined,
    true,
  );
  if (createdShipment) {
    // Verify required fields
    TestValidator.equals(
      "has id",
      typeof createdShipment.id === "string",
      true,
    );
    TestValidator.equals(
      "has carrier",
      typeof createdShipment.carrier === "string",
      true,
    );
    TestValidator.equals(
      "has tracking_number",
      typeof createdShipment.tracking_number === "string",
      true,
    );
    TestValidator.equals(
      "has created_at",
      typeof createdShipment.created_at === "string",
      true,
    );
    TestValidator.predicate("has item_count", createdShipment.item_count >= 1);
    // Verify nested order summary
    TestValidator.equals(
      "has order summary",
      createdShipment.order !== undefined,
      true,
    );
    TestValidator.equals(
      "order has order_number",
      typeof createdShipment.order.order_number === "string",
      true,
    );
  }
  // Verify ordering (newest first by created_at descending)
  for (let i = 1; i < shipmentsList.data.length; i++) {
    const prev = new Date(shipmentsList.data[i - 1].created_at).getTime();
    const curr = new Date(shipmentsList.data[i].created_at).getTime();
    TestValidator.predicate(`shipment ${i} is before ${i + 1}`, prev >= curr);
  }
}