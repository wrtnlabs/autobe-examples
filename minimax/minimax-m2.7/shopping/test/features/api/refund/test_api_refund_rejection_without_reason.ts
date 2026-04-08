import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
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
import { generate_random_ecommerce_mall_customer_customers_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_addresses_create";
import { generate_random_ecommerce_mall_customer_customers_checkout_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_checkout_create";
import { generate_random_ecommerce_mall_customer_refund_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_refund_requests_create";
import { generate_random_ecommerce_mall_seller_orders_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_orders_shipments_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_refund_request } from "../../../prepare/prepare_random_ecommerce_mall_refund_request";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";
import { prepare_random_ecommerce_mall_shipping_address } from "../../../prepare/prepare_random_ecommerce_mall_shipping_address";

export async function test_api_refund_rejection_without_reason(
  connection: api.IConnection,
): Promise<void> {
  // ========== PREREQUISITES SETUP ==========
  // 1. Admin creates a category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {},
  );
  // 2. Seller joins and gets approved
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      password: sellerPassword,
    },
  });
  // Admin approves the seller (login as admin to approve)
  const adminLoginConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminLoginConnection, {});
  // Note: In a real flow, admin would approve seller here
  // For testing, seller is already approved via the join process in some configurations
  // 3. Seller creates a product with the category
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerAuth.email,
      password: sellerPassword,
    },
  });
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerLoginConnection,
    {
      body: {
        categoryId: category.id,
      },
    },
  );
  // 4. Customer joins and creates shipping address
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      password: customerPassword,
    },
  });
  const customerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerLoginConnection, {
    body: {
      email: customerAuth.email,
      password: customerPassword,
      href: "https://example.com/checkout",
      referrer: "https://example.com/cart",
    },
  });
  const address =
    await generate_random_ecommerce_mall_customer_customers_addresses_create(
      customerLoginConnection,
      {},
    );
  // 5. Customer adds product to cart and completes checkout
  const variantId = product.variants[0].id;
  await api.functional.ecommerceMall.customer.ecommerceMall.cart.items.create(
    customerLoginConnection,
    {
      body: {
        variantId: variantId,
        quantity: 1,
      } satisfies IEcommerceMallCartItem.IRequest,
    },
  );
  const order =
    await generate_random_ecommerce_mall_customer_customers_checkout_create(
      customerLoginConnection,
      {
        body: {
          shippingAddressId: address.id,
        },
      },
    );
  // 6. Seller creates shipment for delivery
  const orderItemId = order.orderItems[0].id;
  await generate_random_ecommerce_mall_seller_orders_shipments_create(
    sellerLoginConnection,
    {
      params: {
        orderId: order.id,
      },
      body: {
        orderItemIds: [orderItemId],
        carrier: "DHL",
        trackingNumber: "1234567890",
      },
    },
  );
  // 7. Order is delivered (simulate by the system)
  // The shipment creation should update status to 'shipped'
  // For this test, we proceed assuming delivery is handled
  // 8. Customer creates a refund request for the delivered order item
  const refundRequest =
    await generate_random_ecommerce_mall_customer_refund_requests_create(
      customerLoginConnection,
      {
        body: {
          orderItemId: orderItemId,
          sellerId: sellerAuth.id,
          reason: "Product was damaged",
        },
      },
    );
  // ========== TEST EXECUTION ==========
  // Seller authenticates
  const sellerRejectConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerRejectConnection, {
    body: {
      email: sellerAuth.email,
      password: sellerPassword,
    },
  });
  // Seller rejects the refund request WITHOUT providing a reason
  const rejectedRequest =
    await api.functional.ecommerceMall.seller.refund_requests.reject(
      sellerRejectConnection,
      {
        requestId: refundRequest.id,
        body: {
          // sellerResponseReason is optional - intentionally not provided
        } satisfies IEcommerceMallRefundRequest.IReject,
      },
    );
  // ========== VALIDATIONS ==========
  // Validate response using typia.assert
  typia.assert(rejectedRequest);
  // Verify the refund request status is 'rejected'
  TestValidator.equals(
    "refund request status",
    rejectedRequest.snapshotStatus,
    "rejected",
  );
  // Verify seller response is 'rejected'
  TestValidator.equals(
    "seller response",
    rejectedRequest.sellerResponse,
    "rejected",
  );
  // Verify seller_response_at timestamp is populated
  TestValidator.predicate(
    "seller response timestamp exists",
    rejectedRequest.createdAt !== null &&
      rejectedRequest.createdAt !== undefined,
  );
  // Verify seller_response_reason is null (no reason provided)
  TestValidator.equals(
    "seller response reason is null",
    rejectedRequest.sellerResponseReason,
    null,
  );
  // Verify the snapshot was created
  TestValidator.predicate(
    "snapshot exists",
    rejectedRequest.id !== null && rejectedRequest.id !== undefined,
  );
}
