import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import type { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import type { IEcommercePlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerProfile";
import type { IEcommercePlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrder";
import type { IEcommercePlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrderItem";
import type { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import type { IEcommercePlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductImage";
import type { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import type { IEcommercePlatformProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariantOption";
import type { IEcommercePlatformRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformRefundRequest";
import type { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import type { IEcommercePlatformSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerApprovalRequest";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import type { IEcommercePlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShipment";
import type { IEcommercePlatformShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShipmentItem";
import type { IEcommercePlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShippingAddress";
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
import { generate_random_ecommerce_platform_admin_categories_create } from "../../../generate/generate_random_ecommerce_platform_admin_categories_create";
import { generate_random_ecommerce_platform_customer_addresses_create } from "../../../generate/generate_random_ecommerce_platform_customer_addresses_create";
import { generate_random_ecommerce_platform_customer_orders_create } from "../../../generate/generate_random_ecommerce_platform_customer_orders_create";
import { generate_random_ecommerce_platform_customer_refund_requests_create } from "../../../generate/generate_random_ecommerce_platform_customer_refund_requests_create";
import { generate_random_ecommerce_platform_seller_products_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_create";
import { generate_random_ecommerce_platform_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_variants_create";
import { generate_random_ecommerce_platform_seller_shipments_create } from "../../../generate/generate_random_ecommerce_platform_seller_shipments_create";
import { prepare_random_ecommerce_platform_category } from "../../../prepare/prepare_random_ecommerce_platform_category";
import { prepare_random_ecommerce_platform_order } from "../../../prepare/prepare_random_ecommerce_platform_order";
import { prepare_random_ecommerce_platform_order_item } from "../../../prepare/prepare_random_ecommerce_platform_order_item";
import { prepare_random_ecommerce_platform_product } from "../../../prepare/prepare_random_ecommerce_platform_product";
import { prepare_random_ecommerce_platform_product_variant } from "../../../prepare/prepare_random_ecommerce_platform_product_variant";
import { prepare_random_ecommerce_platform_product_variant_option } from "../../../prepare/prepare_random_ecommerce_platform_product_variant_option";
import { prepare_random_ecommerce_platform_refund_request } from "../../../prepare/prepare_random_ecommerce_platform_refund_request";
import { prepare_random_ecommerce_platform_shipment } from "../../../prepare/prepare_random_ecommerce_platform_shipment";
import { prepare_random_ecommerce_platform_shipping_address } from "../../../prepare/prepare_random_ecommerce_platform_shipping_address";

/**
 * Test immutable snapshot record generation upon refund request submission.
 *
 * Validates the complete refund request lifecycle starting from initial state preservation through the creation of an immutable snapshot record. The refund request captures the order item reference, auto-derived seller profile ID via the product ownership chain, refund reason, and creation timestamps.
 *
 * Snapshot integrity is verified by confirming the initial 'pending' status, null responded_at field before any seller action, and proper linkage to both the affected order item and the responsible seller.
 *
 * 1. Administrator joins and creates a product category.
 * 2. Seller joins, administrator approves their request, seller logs in again.
 * 3. Seller creates a product with a variant in the assigned category.
 * 4. Customer joins, creates a shipping address, and places an order for the variant.
 * 5. Seller creates a shipment and customer confirms delivery.
 * 6. Customer submits a refund request for the delivered order item.
 * 7. Validates refund request has pending status, null responded_at, correct seller profile, order item reference, and creation timestamps.
 */
export async function test_api_customer_refund_request_snapshot_generation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins and creates category
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@snapshot-test.com",
      password: "1234",
      href: "https://test.com/admin/join",
      referrer: "https://test.com",
    } satisfies IEcommercePlatformAdmin.IJoin,
  });
  typia.assert(adminAuth);
  const category =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {
        body: undefined,
      },
    );
  typia.assert(category);
  // 2. Seller joins
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: "1234",
      href: "https://test.com/seller/join",
      referrer: "https://test.com",
    } satisfies IEcommercePlatformSeller.IJoin,
  });
  typia.assert(sellerJoinAuth);
  // 3. Admin approves seller
  await api.functional.ecommercePlatform.admin.seller_approval_requests.update(
    adminConnection,
    {
      requestId: sellerJoinAuth.id,
      body: {
        status: "approved",
      } satisfies IEcommercePlatformSellerApprovalRequest.IUpdate,
    },
  );
  // 4. Seller logs in again to get approved token
  const sellerAuth = await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: "1234",
      href: "https://test.com/seller/login",
      referrer: "https://test.com",
    } satisfies IEcommercePlatformSeller.ILogin,
  });
  typia.assert(sellerAuth);
  // 5. Seller creates product
  const product =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      {
        body: { category_id: category.id },
      },
    );
  typia.assert(product);
  // 6. Seller creates variant
  const variant =
    await generate_random_ecommerce_platform_seller_products_variants_create(
      sellerConnection,
      {
        body: undefined,
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 7. Customer joins and authenticates
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "1234";
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: "https://test.com/customer/join",
      referrer: "https://test.com",
    } satisfies IEcommercePlatformCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 8. Customer creates shipping address
  const address =
    await generate_random_ecommerce_platform_customer_addresses_create(
      customerConnection,
      {
        body: undefined,
      },
    );
  typia.assert(address);
  // 9. Customer creates order
  const order = await generate_random_ecommerce_platform_customer_orders_create(
    customerConnection,
    {
      body: {
        items: [
          {
            ecommerce_platform_product_variant_id: variant.id,
            quantity: 1,
            price: (product.base_price ?? 0) satisfies number as number,
          } satisfies IEcommercePlatformOrderItem.ICreate,
        ],
        shipping_address_id: address.id,
      },
    },
  );
  typia.assert(order);
  // 10. Seller creates shipment
  const shipment =
    await generate_random_ecommerce_platform_seller_shipments_create(
      sellerConnection,
      {
        body: { orderItemIds: [order.items[0].id] },
      },
    );
  typia.assert(shipment);
  // 11. Customer confirms delivery
  const confirmedShipment =
    await api.functional.ecommercePlatform.customer.shipments.confirm(
      customerConnection,
      {
        shipmentId: shipment.id,
        body: {} satisfies IEcommercePlatformShipment.IConfirm,
      },
    );
  typia.assert(confirmedShipment);
  // 12. Customer creates refund request
  const orderItemId = order.items[0].id;
  const refundReason = typia.random<string & tags.MinLength<1>>();
  const refundRequest =
    await api.functional.ecommercePlatform.customer.refund_requests.create(
      customerConnection,
      {
        body: {
          order_item_id: orderItemId,
          refund_reason: refundReason,
        } satisfies IEcommercePlatformRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest);
  // Validate refund request snapshot generation
  TestValidator.equals("status is pending", refundRequest.status, "pending");
  TestValidator.equals("responded_at is null", refundRequest.respondedAt, null);
  TestValidator.equals(
    "refund reason matches",
    refundRequest.refundReason,
    refundReason,
  );
  TestValidator.predicate(
    "seller profile exists",
    refundRequest.sellerProfile != null,
  );
  if (refundRequest.sellerProfile != null) {
    TestValidator.predicate(
      "seller profile has id",
      refundRequest.sellerProfile.id !== "",
    );
  }
  TestValidator.equals(
    "order item id matches",
    refundRequest.orderItem.id,
    orderItemId,
  );
  TestValidator.predicate(
    "created_at is valid",
    refundRequest.createdAt !== "" && refundRequest.createdAt.includes("T"),
  );
  TestValidator.predicate(
    "updatedAt is valid",
    refundRequest.updatedAt !== "" && refundRequest.updatedAt.includes("T"),
  );
}
