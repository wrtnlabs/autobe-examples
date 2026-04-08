import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequest";
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
import { generate_random_ecommerce_mall_customer_customers_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_cart_items_create";
import { generate_random_ecommerce_mall_customer_customers_checkout_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_checkout_create";
import { generate_random_ecommerce_mall_customer_refund_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_refund_requests_create";
import { generate_random_ecommerce_mall_seller_orders_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_orders_shipments_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_refund_request } from "../../../prepare/prepare_random_ecommerce_mall_refund_request";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";
import { prepare_random_ecommerce_mall_shipping_address } from "../../../prepare/prepare_random_ecommerce_mall_shipping_address";

export async function test_api_refund_snapshot_with_seller_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins the platform
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      actorType: "customer",
      requestedGrade: "admin",
      reason: "Platform administration test",
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Seller joins and registers
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "seller1234",
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller);
  // 3. Customer joins and registers
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "customer123",
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 4. Create category for product listing
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: "Test Category for Refund",
        description: "Category for testing refund workflows",
      },
    },
  );
  typia.assert(category);
  // 5. Seller creates product with variants
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: "Test Product for Refund",
        description: "Product to test refund snapshot functionality",
        categoryId: category.id,
        basePrice: 9999,
      },
    },
  );
  typia.assert(product);
  // Get the first variant from the product
  const variant = product.variants[0];
  typia.assert(variant);
  // 6. Customer adds shipping address
  const address =
    await generate_random_ecommerce_mall_customer_customers_addresses_create(
      customerConnection,
      {
        body: {
          recipientName: "Test Customer",
          phone: "010-1234-5678",
          streetAddress: "123 Test Street",
          city: "Test City",
          state: "Test State",
          postalCode: "12345",
          country: "Test Country",
          isDefault: true,
        },
      },
    );
  typia.assert(address);
  // 7. Customer adds product to cart
  await generate_random_ecommerce_mall_customer_customers_cart_items_create(
    customerConnection,
    {
      body: {
        productVariantId: variant.id,
        quantity: 1,
      },
    },
  );
  // 8. Customer completes checkout
  const order =
    await generate_random_ecommerce_mall_customer_customers_checkout_create(
      customerConnection,
      {
        body: {
          shippingAddressId: address.id,
        },
      },
    );
  typia.assert(order);
  // Get the order item for refund
  const orderItem = order.orderItems[0];
  typia.assert(orderItem);
  // 9. Seller ships the order
  const shipment =
    await generate_random_ecommerce_mall_seller_orders_shipments_create(
      sellerConnection,
      {
        params: {
          orderId: order.id,
        },
        body: {
          orderItemIds: [orderItem.id],
          carrier: "Test Carrier",
          trackingNumber: "TRACK123456",
        },
      },
    );
  typia.assert(shipment);
  // 10. Customer creates refund request with reason 'Product defective'
  const CUSTOMER_REFUND_REASON = "Product defective";
  const refundRequest =
    await generate_random_ecommerce_mall_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: orderItem.id,
          sellerId: seller.id,
          reason: CUSTOMER_REFUND_REASON,
        },
      },
    );
  typia.assert(refundRequest);
  // 11. Seller rejects the refund request with reason
  const SELLER_REJECTION_REASON = "Return policy excludes this case";
  const rejectedRefund =
    await api.functional.ecommerceMall.seller.refund_requests.reject(
      sellerConnection,
      {
        requestId: refundRequest.id,
        body: {
          sellerResponseReason: SELLER_REJECTION_REASON,
        } satisfies IEcommerceMallRefundRequest.IReject,
      },
    );
  typia.assert(rejectedRefund);
  // 12. Test execution: Customer retrieves refund request snapshots
  const snapshotsPage =
    await api.functional.ecommerceMall.customer.refund_requests.snapshots.list(
      customerConnection,
      {
        requestId: refundRequest.id,
      },
    );
  typia.assert(snapshotsPage);
  // Validate response structure
  TestValidator.equals(
    "snapshots page has data",
    snapshotsPage.data.length > 0,
    true,
  );
  TestValidator.equals(
    "pagination exists",
    snapshotsPage.pagination !== null,
    true,
  );
  // Get the snapshot (most recent one should be the rejection)
  const snapshot = snapshotsPage.data[0];
  typia.assert(snapshot);
  // Validate snapshot captures rejection details
  TestValidator.equals(
    "snapshot status is 'rejected'",
    snapshot.snapshotStatus,
    "rejected",
  );
  TestValidator.equals(
    "seller response is 'rejected'",
    snapshot.sellerResponse,
    "rejected",
  );
  TestValidator.equals(
    "seller response reason matches rejection reason",
    snapshot.sellerResponseReason,
    SELLER_REJECTION_REASON,
  );
  // Validate original customer reason is preserved
  TestValidator.equals(
    "snapshot reason matches customer's original reason",
    snapshot.snapshotReason,
    CUSTOMER_REFUND_REASON,
  );
  // Validate snapshot includes seller and customer summary objects
  TestValidator.equals(
    "customer summary exists in snapshot",
    snapshot.customer !== null && snapshot.customer !== undefined,
    true,
  );
  TestValidator.equals(
    "customer id matches original customer",
    snapshot.customer.id,
    customer.id,
  );
  TestValidator.equals(
    "seller summary exists in snapshot",
    snapshot.seller !== null && snapshot.seller !== undefined,
    true,
  );
  TestValidator.equals(
    "seller id matches original seller",
    snapshot.seller.id,
    seller.id,
  );
  // Validate snapshot is immutable (timestamps exist)
  TestValidator.equals(
    "created_at timestamp exists",
    snapshot.createdAt !== null && snapshot.createdAt !== undefined,
    true,
  );
  TestValidator.equals(
    "updated_at timestamp exists",
    snapshot.updatedAt !== null && snapshot.updatedAt !== undefined,
    true,
  );
  // The snapshot serves as evidence - verify immutable nature by checking all key fields are present
  TestValidator.predicate(
    "snapshot has all required evidence fields",
    snapshot.snapshotReason.length > 0 &&
      snapshot.snapshotStatus.length > 0 &&
      snapshot.sellerResponse.length > 0,
  );
}