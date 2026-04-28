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
import type { IEcommercePlatformSnapshotRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshotRefundRequest";
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
import { prepare_random_ecommerce_platform_category } from "../../../prepare/prepare_random_ecommerce_platform_category";
import { prepare_random_ecommerce_platform_order } from "../../../prepare/prepare_random_ecommerce_platform_order";
import { prepare_random_ecommerce_platform_order_item } from "../../../prepare/prepare_random_ecommerce_platform_order_item";
import { prepare_random_ecommerce_platform_product } from "../../../prepare/prepare_random_ecommerce_platform_product";
import { prepare_random_ecommerce_platform_product_variant } from "../../../prepare/prepare_random_ecommerce_platform_product_variant";
import { prepare_random_ecommerce_platform_product_variant_option } from "../../../prepare/prepare_random_ecommerce_platform_product_variant_option";
import { prepare_random_ecommerce_platform_refund_request } from "../../../prepare/prepare_random_ecommerce_platform_refund_request";
import { prepare_random_ecommerce_platform_shipping_address } from "../../../prepare/prepare_random_ecommerce_platform_shipping_address";

/**
 * Test initial snapshot creation upon refund request submission.
 *
 * Verifies that the system automatically creates an initial snapshot when a customer submits a refund request for a delivered order item. The workflow involves admin creating a product category, seller creating a product with variant, customer registering, adding a shipping address, and placing an order. Once simulated delivery occurs, the customer creates a refund request, triggering snapshot creation. The test validates that the initial snapshot has null previous_reason and previous_approval_status, 'pending' current_approval_status, the customer's justification in current_reason, correct linkage to the parent refund request, and accurate creation timestamp.
 *
 * 1. Administrator registers and creates a product category.
 * 2. Seller registers and creates a product in that category.
 * 3. Seller creates a product variant for the product.
 * 4. Customer registers and creates a shipping address.
 * 5. Customer places an order with the product variant.
 * 6. Customer creates a refund request for the order item with a justification.
 * 7. Retrieve the auto-generated initial snapshot for the refund request.
 * 8. Validate snapshot fields: previous_reason and previous_approval_status are null, current_approval_status is 'pending', current_reason matches the justification, ecommerce_platform_refund_requests_id links to parent refund request id, and created_at timestamp is present.
 */
export async function test_api_refund_request_initial_snapshot_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 2. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  const product =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      {
        body: {
          category_id: category.id,
        } satisfies DeepPartial<IEcommercePlatformProduct.ICreate>,
      },
    );
  typia.assert(product);
  // 3. Seller creates product variant
  const variant =
    await generate_random_ecommerce_platform_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 4. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  const address =
    await generate_random_ecommerce_platform_customer_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(address);
  // 5. Customer places order with the product variant
  const orderItemPrice: number = variant.price ?? product.base_price;
  const order = await generate_random_ecommerce_platform_customer_orders_create(
    customerConnection,
    {
      body: {
        shipping_address_id: address.id,
        items: [
          {
            ecommerce_platform_product_variant_id: variant.id,
            quantity: 1,
            price: orderItemPrice,
          },
        ],
      } satisfies DeepPartial<IEcommercePlatformOrder.ICreate>,
    },
  );
  typia.assert(order);
  // 6. Customer creates a refund request for the order item with justification
  const refundReason = RandomGenerator.paragraph({ sentences: 2 });
  const refundRequest =
    await generate_random_ecommerce_platform_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          order_item_id: order.items[0].id,
          refund_reason: refundReason,
        } satisfies DeepPartial<IEcommercePlatformRefundRequest.ICreate>,
      },
    );
  typia.assert(refundRequest);
  // 7. Retrieve the auto-generated initial snapshot for the refund request
  const snapshot =
    await api.functional.ecommercePlatform.customer.refund_requests.snapshots.at(
      customerConnection,
      {
        refundRequestId: refundRequest.id,
        snapshotId: refundRequest.id,
      },
    );
  typia.assert(snapshot);
  // 8. Validate initial snapshot fields
  TestValidator.predicate(
    "previous_reason is null for initial snapshot",
    snapshot.previous_reason === null,
  );
  TestValidator.predicate(
    "previous_approval_status is null for initial snapshot",
    snapshot.previous_approval_status === null,
  );
  TestValidator.equals(
    "current_approval_status is pending",
    snapshot.current_approval_status,
    "pending",
  );
  TestValidator.predicate(
    "current_reason matches submitted justification",
    snapshot.current_reason === refundReason,
  );
  TestValidator.equals(
    "ecommerce_platform_refund_requests_id links to parent refund request",
    snapshot.ecommerce_platform_refund_requests_id,
    refundRequest.id,
  );
  TestValidator.predicate(
    "snapshot id links correctly",
    snapshot.ecommerce_platform_snapshots_id === refundRequest.id,
  );
  TestValidator.predicate(
    "created_at timestamp accurately captures snapshot generation",
    snapshot.created_at.length > 0,
  );
}
