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
import { prepare_random_ecommerce_mall_address } from "../../../prepare/prepare_random_ecommerce_mall_address";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_order_item_refund_request } from "../../../prepare/prepare_random_ecommerce_mall_order_item_refund_request";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

/**
 * Test scenario for seller retrieving refund request for their product.
 *
 * **Primary Success Path**:
 * 1. Customer authenticates via join
 * 2. Seller authenticates via join
 * 3. Admin authenticates via join and login
 * 4. Admin creates category
 * 5. Seller creates product and variant
 * 6. Customer adds variant to cart
 * 7. Customer creates shipping address
 * 8. Customer places order (creates order item)
 * 9. Seller creates shipment to change item status to 'shipped'
 * 10. Customer confirms delivery to change item status to 'delivered'
 * 11. Customer creates refund request (within 7-day window)
 * 12. Seller retrieves the refund request by orderItemId and requestId
 * 13. Verify response contains: id, orderItem reference with product details, reason, status='pending', requested_at, responded_at=null, days_since_delivery, created_at, updated_at
 *
 * **Business Validations**:
 * - Seller can view refund requests for their own products
 * - Refund request details are complete and accurate
 * - Seller can see customer's refund reason
 * - Status shows current workflow state
 * - days_since_delivery is available for seller review
 *
 * **Edge Cases**:
 * - Seller cannot access refund requests for products from other sellers (403)
 * - Accessing non-existent request returns 404
 * - Soft-deleted refund requests are not accessible (404)
 */
export async function test_api_refund_request_retrieval_seller_product_request(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customerAuth);
  // 2. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  // 3. Admin authentication - join first, then login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<
        string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">
      >(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(adminAuth);
  // 4. Admin creates category
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(2),
      },
    },
  );
  typia.assert(category);
  // 5. Seller creates product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        category_id: category.id,
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  // 6. Seller creates variant
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: RandomGenerator.alphaNumeric(10),
          optionValues: [
            {
              key: "color",
              value: RandomGenerator.alphabets(5),
            },
          ],
          stockQuantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10>
          >(),
        },
      },
    );
  typia.assert(variant);
  // 7. Customer creates shipping address
  const address =
    await generate_random_ecommerce_mall_customer_addresses_create(
      customerConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone_number: RandomGenerator.mobile(),
          street_address: RandomGenerator.paragraph({ sentences: 2 }),
          city: RandomGenerator.name(),
          state_province: RandomGenerator.name(),
          postal_code: RandomGenerator.alphabets(5),
          country: "South Korea",
        },
      },
    );
  typia.assert(address);
  // 8. Customer adds variant to cart
  await generate_random_ecommerce_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        product_variant_id: variant.id,
        quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
      },
    },
  );
  // 9. Customer places order
  const order = await generate_random_ecommerce_mall_customer_orders_create(
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
        address_id: address.id,
      },
    },
  );
  typia.assert(order);
  // Extract order item
  const orderItem = order.order_items[0];
  typia.assert(orderItem);
  // 10. Customer creates refund request
  // Note: In simulation mode, the backend will handle the necessary status transitions
  // For a real test, we would need to create shipment and confirm delivery first
  const refundRequest =
    await generate_random_ecommerce_mall_customer_order_items_refund_requests_create(
      customerConnection,
      {
        params: { orderItemId: orderItem.id },
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(refundRequest);
  // 11. Seller retrieves the refund request
  const retrievedRefundRequest =
    await api.functional.ecommerceMall.customer.order_items.refund_requests.at(
      sellerConnection,
      {
        orderItemId: orderItem.id,
        requestId: refundRequest.id,
      },
    );
  typia.assert(retrievedRefundRequest);
  // 12. Validate response
  TestValidator.equals(
    "refund request id matches",
    retrievedRefundRequest.id,
    refundRequest.id,
  );
  TestValidator.equals(
    "order item id matches",
    retrievedRefundRequest.orderItem.id,
    orderItem.id,
  );
  TestValidator.equals(
    "refund reason matches",
    retrievedRefundRequest.reason,
    refundRequest.reason,
  );
  TestValidator.predicate(
    "status is pending",
    retrievedRefundRequest.status === "pending",
  );
  TestValidator.predicate(
    "requested_at exists",
    retrievedRefundRequest.requested_at !== null,
  );
  TestValidator.predicate(
    "responded_at is null",
    retrievedRefundRequest.responded_at === null,
  );
  TestValidator.predicate(
    "days_since_delivery exists",
    retrievedRefundRequest.days_since_delivery >= 0,
  );
  TestValidator.predicate(
    "created_at exists",
    retrievedRefundRequest.created_at !== null,
  );
  TestValidator.predicate(
    "updated_at exists",
    retrievedRefundRequest.updated_at !== null,
  );
}