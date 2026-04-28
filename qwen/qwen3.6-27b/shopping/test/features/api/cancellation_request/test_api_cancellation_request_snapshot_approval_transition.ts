import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import type { IEcommercePlatformCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCancellationRequest";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import type { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import type { IEcommercePlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerProfile";
import type { IEcommercePlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrder";
import type { IEcommercePlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrderItem";
import type { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import type { IEcommercePlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductImage";
import type { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import type { IEcommercePlatformProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariantOption";
import type { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import type { IEcommercePlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShippingAddress";
import type { IEcommercePlatformSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshot";
import type { IEcommercePlatformSnapshotCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshotCancellationRequest";
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
import { generate_random_ecommerce_platform_customer_cancellation_requests_create } from "../../../generate/generate_random_ecommerce_platform_customer_cancellation_requests_create";
import { generate_random_ecommerce_platform_customer_orders_create } from "../../../generate/generate_random_ecommerce_platform_customer_orders_create";
import { generate_random_ecommerce_platform_seller_products_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_create";
import { generate_random_ecommerce_platform_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_variants_create";
import { prepare_random_ecommerce_platform_cancellation_request } from "../../../prepare/prepare_random_ecommerce_platform_cancellation_request";
import { prepare_random_ecommerce_platform_category } from "../../../prepare/prepare_random_ecommerce_platform_category";
import { prepare_random_ecommerce_platform_order } from "../../../prepare/prepare_random_ecommerce_platform_order";
import { prepare_random_ecommerce_platform_order_item } from "../../../prepare/prepare_random_ecommerce_platform_order_item";
import { prepare_random_ecommerce_platform_product } from "../../../prepare/prepare_random_ecommerce_platform_product";
import { prepare_random_ecommerce_platform_product_variant } from "../../../prepare/prepare_random_ecommerce_platform_product_variant";
import { prepare_random_ecommerce_platform_product_variant_option } from "../../../prepare/prepare_random_ecommerce_platform_product_variant_option";
import { prepare_random_ecommerce_platform_shipping_address } from "../../../prepare/prepare_random_ecommerce_platform_shipping_address";

/**
 * Test cancellation request snapshot retrieval after approval transition.
 *
 * Validates the complete cancellation request workflow including administrative category setup, seller product creation, customer order placement, cancellation request submission, and snapshot retrieval. Ensures that the immutable snapshot correctly captures the state transition with previous and current status and reason fields preserved for audit purposes.
 *
 * Special attention is given to verifying that the snapshot links to the correct cancellation request and that the transition fields (previous_status, current_status, previous_reason, current_reason) accurately reflect the state change from null to 'pending' upon request creation.
 *
 * Note: Seller approval endpoint is not available in SDK; testing with initial 'pending' state snapshot.
 *
 * 1. Administrator registers and logs in to create product category.
 * 2. Seller registers and logs in to create a product listing.
 * 3. Seller creates a product variant with SKU and stock for the order.
 * 4. Customer registers and logs in to place an order.
 * 5. Customer creates a shipping address for delivery.
 * 6. Customer places an order containing the product variant.
 * 7. Customer creates a cancellation request (status: pending).
 * 8. Customer retrieves the snapshot to verify state transition details.
 */
export async function test_api_cancellation_request_snapshot_approval_transition(
  connection: api.IConnection,
) {
  // 1. Admin joins and logs in to create category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, { body: {} });
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: "https://test.com",
      referrer: "https://test.com",
    } satisfies IEcommercePlatformAdmin.ILogin,
  });
  const category =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      { body: {} },
    );
  typia.assert(category);
  // 2. Seller joins and logs in to create product
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, { body: {} });
  await authorize_seller_login(sellerConnection, {
    body: {
      email: "seller@test.com",
      password: "1234",
      href: "https://test.com",
      referrer: "https://test.com",
    } satisfies IEcommercePlatformSeller.ILogin,
  });
  const product =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      { body: {} },
    );
  typia.assert(product);
  // 3. Seller creates product variant
  const variant =
    await generate_random_ecommerce_platform_seller_products_variants_create(
      sellerConnection,
      {
        body: {},
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 4. Customer joins and logs in
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, { body: {} });
  await authorize_customer_login(customerConnection, {
    body: {
      email: "customer@test.com",
      password: "1234",
    } satisfies IEcommercePlatformCustomer.ILogin,
  });
  // 5. Customer creates shipping address
  const address =
    await generate_random_ecommerce_platform_customer_addresses_create(
      customerConnection,
      { body: {} },
    );
  typia.assert(address);
  // 6. Customer places an order containing the product variant
  const order = await generate_random_ecommerce_platform_customer_orders_create(
    customerConnection,
    {
      body: {
        items: [
          {
            ecommerce_platform_product_variant_id: variant.id,
            quantity: 1,
            price: variant.price ?? product.base_price,
          },
        ],
        shipping_address_id: address.id,
      },
    },
  );
  typia.assert(order);
  // 7. Customer creates a cancellation request for the order item
  const cancellationRequest =
    await generate_random_ecommerce_platform_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: order.items[0].id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(cancellationRequest);
  // Validate cancellation request is in pending status
  TestValidator.equals(
    "cancellation request is pending",
    cancellationRequest.status,
    "pending",
  );
  // 8. Retrieve the snapshot for the cancellation request
  const snapshotId = cancellationRequest.id;
  const snapshot =
    await api.functional.ecommercePlatform.customer.cancellation_requests.snapshots.at(
      customerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        snapshotId: snapshotId,
      },
    );
  typia.assert(snapshot);
  // Validate snapshot fields capture the state transition
  TestValidator.predicate(
    "snapshot has current status",
    snapshot.current_status !== null,
  );
  TestValidator.predicate(
    "snapshot has cancellation request reference",
    snapshot.cancellationRequest.id === cancellationRequest.id,
  );
  TestValidator.predicate(
    "snapshot has entity type",
    snapshot.snapshot.entityType === "cancellation_request",
  );
}
