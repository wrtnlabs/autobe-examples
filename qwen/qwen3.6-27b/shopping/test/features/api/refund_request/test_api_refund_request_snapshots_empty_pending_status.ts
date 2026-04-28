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
 * Test refund request snapshots when request is pending with no seller response.
 *
 * Validates the edge case where a refund request has been submitted but the seller has not yet approved or rejected it. In this pre-response state, no approval/rejection transition snapshots exist in the audit trail. The customer must complete the full prerequisite chain: register, have admin create a category, have seller create a product with variants, create an address, place an order, ensure the order item is delivered, and submit a refund request with a reason.
 *
 * Since no seller response has occurred, querying the snapshot endpoint returns pagination metadata reflecting zero or minimal snapshot records. This ensures the API gracefully handles refund requests awaiting seller review without errors.
 *
 * 1. Customer registers and authenticates.
 * 2. Admin authenticates and creates a product category.
 * 3. Seller authenticates and creates a product in the category.
 * 4. Seller creates a product variant with SKU and options for the product.
 * 5. Customer creates a shipping address for order delivery.
 * 6. Customer places an order referencing the product variant.
 * 7. Customer submits a refund request for an order item.
 * 8. Customer queries snapshot records and validates empty response with valid pagination metadata.
 */
export async function test_api_refund_request_snapshots_empty_pending_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, { body: {} });
  // 2. Admin authentication and category creation
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: "http://admin.test.com",
      referrer: "http://admin.test.com/login",
    } satisfies IEcommercePlatformAdmin.ILogin,
  });
  const category =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      { body: {} },
    );
  typia.assert(category);
  // 3. Seller authentication and product creation
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: "seller@test.com",
      password: "1234",
      href: "http://seller.test.com",
      referrer: "http://seller.test.com/login",
    } satisfies IEcommercePlatformSeller.ILogin,
  });
  const product =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      {
        body: {
          category_id: category.id,
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(product);
  // 4. Seller creates product variant with SKU and options
  const variant =
    await generate_random_ecommerce_platform_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          skuCode: RandomGenerator.alphaNumeric(10),
          price: 15000,
          options: [
            { attributeKey: "color", attributeValue: "Red" },
            { attributeKey: "size", attributeValue: "L" },
          ],
        },
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 5. Customer creates shipping address
  const address =
    await generate_random_ecommerce_platform_customer_addresses_create(
      customerConnection,
      { body: {} },
    );
  typia.assert(address);
  // 6. Customer places order referencing the product variant
  const order = await api.functional.ecommercePlatform.customer.orders.create(
    customerConnection,
    {
      body: {
        items: [
          {
            ecommerce_platform_product_variant_id: variant.id,
            quantity: 1,
            price: 15000,
          },
        ],
        shipping_address_id: address.id,
      } satisfies IEcommercePlatformOrder.ICreate,
    },
  );
  typia.assert(order);
  // 7. Customer submits refund request for delivered order item
  const refundRequest =
    await api.functional.ecommercePlatform.customer.refund_requests.create(
      customerConnection,
      {
        body: {
          order_item_id: order.items[0].id,
          refund_reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IEcommercePlatformRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest);
  // 8. Customer queries snapshot records for the refund request
  const snapshots =
    await api.functional.ecommercePlatform.customer.refund_requests.snapshots.index(
      customerConnection,
      {
        refundRequestId: refundRequest.id,
        body: {} satisfies IEcommercePlatformSnapshotRefundRequest.IRequest,
      },
    );
  typia.assert(snapshots);
  // Validate response has valid pagination metadata
  TestValidator.predicate(
    "pagination current page is at least 1",
    snapshots.pagination.current >= 1,
  );
  TestValidator.equals(
    "data array is empty - no snapshots for pending refund request",
    0,
    snapshots.data.length,
  );
  TestValidator.equals(
    "pagination records count is 0",
    0,
    snapshots.pagination.records,
  );
  TestValidator.equals(
    "pagination pages count is 0",
    0,
    snapshots.pagination.pages,
  );
}
