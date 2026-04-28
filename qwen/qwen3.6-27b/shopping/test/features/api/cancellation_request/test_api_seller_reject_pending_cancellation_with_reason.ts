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
 * Validates seller rejection of a pending cancellation request with persistence of the rejection reason.
 *
 * Exercises the end-to-end flow of product listing, order placement, cancellation request creation, and seller rejection. The seller provides a specific rejection reason when denying the customer's cancellation request, and the system must transition the request status to 'rejected' while preserving the seller's explanation in the seller_response_reason field.
 *
 * The corresponding order item must remain unaffected in its 'paid' status, with no inventory restoration or downstream processing triggered by the rejection decision.
 *
 * 1. Administrator registers and creates a product category.
 * 2. Seller registers and creates a product within the category, then adds a product variant.
 * 3. Customer registers, creates a shipping address, and places an order containing the product variant.
 * 4. Customer submits a cancellation request for that order item, which enters 'pending' status.
 * 5. Seller rejects the cancellation request with a specific rejection reason.
 * 6. Validates status is 'rejected', seller_response_reason is persisted, and order item status remains 'paid'.
 */
export async function test_api_seller_reject_pending_cancellation_with_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin registers and creates a product category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 2. Seller registers, creates a product, and adds a variant
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
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
  // 3. Customer registers, creates shipping address, places order
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  const shippingAddress =
    await generate_random_ecommerce_platform_customer_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(shippingAddress);
  const order = await api.functional.ecommercePlatform.customer.orders.create(
    customerConnection,
    {
      body: {
        shipping_address_id: shippingAddress.id,
        items: [
          {
            ecommerce_platform_product_variant_id: variant.id,
            quantity: 1,
            price: product.base_price,
          },
        ],
      } satisfies IEcommercePlatformOrder.ICreate,
    },
  );
  typia.assert(order);
  // 4. Customer creates a cancellation request for the order item (status: pending)
  const orderItemId = order.items[0].id;
  const cancellationRequest =
    await api.functional.ecommercePlatform.customer.cancellation_requests.create(
      customerConnection,
      {
        body: {
          orderItemId,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEcommercePlatformCancellationRequest.ICreate,
      },
    );
  typia.assert(cancellationRequest);
  // 5. Seller rejects the pending cancellation request with a reason
  const rejectionReason = RandomGenerator.paragraph({ sentences: 3 });
  const updatedCancellationRequest =
    await api.functional.ecommercePlatform.seller.cancellation_requests.update(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          status: "rejected",
          seller_response_reason: rejectionReason,
        } satisfies IEcommercePlatformCancellationRequest.IUpdate,
      },
    );
  typia.assert(updatedCancellationRequest);
  // 6. Validate: status is 'rejected', reason persisted, order item unchanged
  TestValidator.equals(
    "cancellation request status is rejected",
    updatedCancellationRequest.status,
    "rejected",
  );
  TestValidator.equals(
    "seller response reason is persisted",
    updatedCancellationRequest.seller_response_reason,
    rejectionReason,
  );
  TestValidator.equals(
    "order item status remains paid after rejection",
    updatedCancellationRequest.orderItem.status,
    "paid",
  );
}
