import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallOrderItemRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemRefundRequest";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_ecommerce_mall_customer_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_addresses_create";
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_customer_order_items_refund_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_order_items_refund_requests_create";
import { generate_random_ecommerce_mall_customer_orders_create } from "../../../generate/generate_random_ecommerce_mall_customer_orders_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { generate_random_ecommerce_mall_seller_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_address } from "../../../prepare/prepare_random_ecommerce_mall_address";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_order_item_refund_request } from "../../../prepare/prepare_random_ecommerce_mall_order_item_refund_request";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

/**
 * Test customer retrieving their own refund request details.
 *
 * Primary Success Path:
 * 1. Customer authenticates via join
 * 2. Admin creates category
 * 3. Seller creates product and variant
 * 4. Customer adds variant to cart
 * 5. Customer creates shipping address
 * 6. Customer places order (creates order item with 'paid' status)
 * 7. Seller creates shipment to change item status to 'shipped'
 * 8. Customer confirms delivery to change item status to 'delivered'
 * 9. Customer creates refund request (within 7-day window)
 * 10. Customer retrieves the refund request by orderItemId and requestId
 * 11. Verify response contains: id, orderItem reference, reason, status='pending', requested_at timestamp, responded_at=null, days_since_delivery (<=7), created_at, updated_at, deleted_at=null
 *
 * Business Validations:
 * - Refund request reason matches what was submitted
 * - Status is 'pending' (awaiting seller response)
 * - responded_at is null (not yet responded)
 * - days_since_delivery is calculated correctly and <=7
 * - orderItem reference shows correct item details
 * - Customer can only access their own refund requests (authorization)
 *
 * Edge Cases:
 * - Attempting to access another customer's refund request returns 403 Forbidden
 * - Accessing non-existent refund request returns 404 Not Found
 * - Accessing deleted refund request returns 404 (soft-deleted records filtered)
 */
export async function test_api_refund_request_retrieval_customer_own_request(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authenticates via join
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Admin creates category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.assert<IEcommerceMallAdmin.IJoin>({
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    }),
  });
  const category = await api.functional.ecommerceMall.admin.categories.create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
      } satisfies IEcommerceMallCategory.ICreate,
    },
  );
  typia.assert(category);
  // 3. Seller creates product and variant
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  const product = await api.functional.ecommerceMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        category_id: category.id,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  const variant =
    await api.functional.ecommerceMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          skuCode: RandomGenerator.alphaNumeric(10),
          optionValues: [
            {
              key: "color",
              value: RandomGenerator.alphabets(5),
            },
          ] satisfies IEcommerceMallProductVariantOption[],
          stockQuantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10>
          >(),
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 4. Customer adds variant to cart
  await api.functional.ecommerceMall.customer.cart_items.create(
    customerConnection,
    {
      body: {
        product_variant_id: variant.id,
        quantity: 1,
      } satisfies IEcommerceMallCartItem.ICreate,
    },
  );
  // 5. Customer creates shipping address
  const address = await api.functional.ecommerceMall.customer.addresses.create(
    customerConnection,
    {
      body: {
        recipient_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        street_address: RandomGenerator.paragraph({ sentences: 2 }),
        city: RandomGenerator.name(),
        state_province: RandomGenerator.name(),
        postal_code: RandomGenerator.alphaNumeric(10),
        country: RandomGenerator.name(),
      } satisfies IEcommerceMallAddress.ICreate,
    },
  );
  typia.assert(address);
  // 6. Customer places order (creates order item with 'paid' status)
  const order = await api.functional.ecommerceMall.customer.orders.create(
    customerConnection,
    {
      body: {
        shipping_recipient_name: address.recipientName,
        shipping_phone_number: address.phoneNumber,
        shipping_street_address: address.streetAddress,
        shipping_city: address.city,
        shipping_state: address.stateProvince,
        shipping_postal_code: address.postalCode,
        shipping_country: address.country,
      } satisfies IEcommerceMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // Get the order item
  const orderItem = order.order_items[0];
  typia.assert(orderItem);
  // 7. Seller creates shipment to change item status to 'shipped'
  const shipment = await api.functional.ecommerceMall.seller.shipments.create(
    sellerConnection,
    {
      body: {
        trackingNumber: RandomGenerator.alphaNumeric(15),
        carrierName: RandomGenerator.name(),
        shippedAt: new Date().toISOString(),
        orderItemIds: [orderItem.id],
      } satisfies IEcommerceMallShipment.ICreate,
    },
  );
  typia.assert(shipment);
  // 8. Customer confirms delivery to change item status to 'delivered'
  await api.functional.ecommerceMall.customer.orders.shipments.confirmDelivery(
    customerConnection,
    {
      orderId: order.id,
      shipmentId: shipment.id,
      body: {},
    },
  );
  // 9. Customer creates refund request (within 7-day window)
  const refundRequest =
    await api.functional.ecommerceMall.customer.order_items.refund_requests.create(
      customerConnection,
      {
        orderItemId: orderItem.id,
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEcommerceMallOrderItemRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest);
  // 10. Customer retrieves the refund request by orderItemId and requestId
  const retrievedRefundRequest =
    await api.functional.ecommerceMall.customer.order_items.refund_requests.at(
      customerConnection,
      {
        orderItemId: orderItem.id,
        requestId: refundRequest.id,
      },
    );
  typia.assert(retrievedRefundRequest);
  // 11. Verify response contains required fields
  TestValidator.equals(
    "refund request id matches",
    retrievedRefundRequest.id,
    refundRequest.id,
  );
  TestValidator.equals(
    "refund request reason matches",
    retrievedRefundRequest.reason,
    refundRequest.reason,
  );
  TestValidator.equals(
    "refund request status is pending",
    retrievedRefundRequest.status,
    "pending",
  );
  TestValidator.equals(
    "responded_at is null",
    retrievedRefundRequest.responded_at,
    null,
  );
  TestValidator.predicate(
    "days_since_delivery is <= 7",
    retrievedRefundRequest.days_since_delivery <= 7,
  );
  TestValidator.equals(
    "order item id matches",
    retrievedRefundRequest.orderItem.id,
    orderItem.id,
  );
}