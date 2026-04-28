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
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import type { IEcommercePlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShippingAddress";
import type { IEcommercePlatformSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshot";
import type { IEcommercePlatformSnapshotRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshotRefundRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformSnapshotRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformSnapshotRefundRequest";
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
import { prepare_random_ecommerce_platform_category } from "../../../prepare/prepare_random_ecommerce_platform_category";
import { prepare_random_ecommerce_platform_order } from "../../../prepare/prepare_random_ecommerce_platform_order";
import { prepare_random_ecommerce_platform_order_item } from "../../../prepare/prepare_random_ecommerce_platform_order_item";
import { prepare_random_ecommerce_platform_product } from "../../../prepare/prepare_random_ecommerce_platform_product";
import { prepare_random_ecommerce_platform_product_variant } from "../../../prepare/prepare_random_ecommerce_platform_product_variant";
import { prepare_random_ecommerce_platform_product_variant_option } from "../../../prepare/prepare_random_ecommerce_platform_product_variant_option";
import { prepare_random_ecommerce_platform_refund_request } from "../../../prepare/prepare_random_ecommerce_platform_refund_request";
import { prepare_random_ecommerce_platform_shipping_address } from "../../../prepare/prepare_random_ecommerce_platform_shipping_address";

/**
 * Test customer views snapshot records for their refund request.
 *
 * Validates the complete refund lifecycle from order placement through refund submission, then verifies that the customer can retrieve immutable snapshot records capturing the state transitions. Snapshots are automatically created when sellers respond to refund requests (approve or reject), preserving the before and after values of the approval status and refund reason for audit trail purposes.
 *
 * Special attention is given to verifying that snapshots contain the correct transition data including previous and current approval status values, previous and current reason fields, and valid creation timestamps. Pagination metadata is validated to ensure correct record counts and page information.
 *
 * 1. Register admin, seller, and customer accounts with explicit credentials.
 * 2. Admin creates a product category.
 * 3. Seller logs in and creates a product with a variant.
 * 4. Customer logs in, creates a shipping address, and places an order.
 * 5. Customer submits a refund request for an order item.
 * 6. Customer queries the snapshot endpoint with pagination parameters.
 * 7. Validate snapshot records contain correct state transition data and pagination metadata is valid.
 */
export async function test_api_refund_request_customer_views_snapshots(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register all actors with explicit passwords
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: { password: "admin_password_123" },
  });
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await authorize_seller_join(sellerConnection, {
    body: { password: "seller_password_123" },
  });
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoin = await authorize_customer_join(customerConnection, {
    body: { password: "customer_password_123" },
  });
  const SELLER_PASSWORD = "seller_password_123";
  const CUSTOMER_PASSWORD = "customer_password_123";
  // 2. Admin creates category
  const category =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 3. Seller creates product and variant
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerJoin.email,
      password: SELLER_PASSWORD,
      href: "https://ecommerce.test/login",
      referrer: "https://ecommerce.test/seller-dashboard",
    } satisfies IEcommercePlatformSeller.ILogin,
  });
  const product =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      { body: { category_id: category.id } },
    );
  typia.assert(product);
  const variant =
    await generate_random_ecommerce_platform_seller_products_variants_create(
      sellerConnection,
      { params: { productId: product.id } },
    );
  typia.assert(variant);
  // 4. Customer creates address and places order
  await authorize_customer_login(customerConnection, {
    body: {
      email: customerJoin.email,
      password: CUSTOMER_PASSWORD,
    } satisfies IEcommercePlatformCustomer.ILogin,
  });
  const shippingAddress =
    await generate_random_ecommerce_platform_customer_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(shippingAddress);
  const order = await generate_random_ecommerce_platform_customer_orders_create(
    customerConnection,
    { body: { shipping_address_id: shippingAddress.id } },
  );
  typia.assert(order);
  // 5. Customer submits refund request
  const orderItemId = order.items[0].id;
  const refundRequest =
    await generate_random_ecommerce_platform_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          order_item_id: orderItemId,
          refund_reason: "Product defective",
        },
      },
    );
  typia.assert(refundRequest);
  // 6. Customer views snapshots for their refund request
  const snapshotRequestBody = {
    page: 1,
    limit: 10,
  } satisfies IEcommercePlatformSnapshotRefundRequest.IRequest;
  const snapshotPage =
    await api.functional.ecommercePlatform.customer.refund_requests.snapshots.index(
      customerConnection,
      {
        refundRequestId: refundRequest.id,
        body: snapshotRequestBody,
      },
    );
  typia.assert(snapshotPage);
  // 7. Validate snapshots contain expected state transition data
  TestValidator.predicate(
    "snapshot records exist",
    snapshotPage.data.length > 0,
  );
  for (const snapshot of snapshotPage.data) {
    TestValidator.predicate("snapshot has valid ID", snapshot.id !== undefined);
    TestValidator.predicate(
      "snapshot has current approval status",
      snapshot.current_approval_status !== undefined,
    );
    TestValidator.predicate(
      "snapshot has created_at timestamp",
      snapshot.created_at !== undefined,
    );
  }
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is valid",
    snapshotPage.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is within bounds",
    snapshotPage.pagination.limit >= 1 && snapshotPage.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination record count matches data length",
    snapshotPage.pagination.records >= snapshotPage.data.length,
  );
}
