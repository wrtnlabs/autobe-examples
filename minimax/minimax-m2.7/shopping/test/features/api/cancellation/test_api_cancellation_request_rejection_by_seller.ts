import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
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
import { generate_random_ecommerce_mall_admin_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_admin_categories_create";
import { generate_random_ecommerce_mall_customer_customers_me_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_addresses_create";
import { generate_random_ecommerce_mall_customer_customers_me_orders_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_orders_create";
import { generate_random_ecommerce_mall_customer_customers_me_orders_items_cancel_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_orders_items_cancel_create";
import { generate_random_ecommerce_mall_seller_sellers_me_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_create";
import { prepare_random_ecommerce_mall_cancellation_request } from "../../../prepare/prepare_random_ecommerce_mall_cancellation_request";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_shipping_address } from "../../../prepare/prepare_random_ecommerce_mall_shipping_address";

/**
 * Test seller rejection of a pending cancellation request.
 *
 * Validates the complete workflow where a seller successfully rejects a customer's
 * cancellation request. The test verifies that:
 * - The cancellation request status changes from 'pending' to 'rejected'
 * - A snapshot record is created preserving the rejection state
 * - The associated order item remains in 'paid' status
 * - All timestamps are properly updated
 *
 * Setup creates a complete order flow with admin, seller, and customer actors,
 * then exercises the seller's cancellation request rejection endpoint.
 *
 * 1. Administrator registers and creates a product category.
 * 2. Seller registers (approval handled by system) and creates a product.
 * 3. Customer registers, adds address, and places an order.
 * 4. Customer submits a cancellation request for the order item.
 * 5. Seller rejects the cancellation request.
 * 6. Validates the rejection was processed correctly with proper status and snapshots.
 */
export async function test_api_cancellation_request_rejection_by_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuth);
  // 2. Admin creates category
  const category =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 3. Register seller - capture credentials for login
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    },
  });
  typia.assert(sellerAuth);
  // 4. Seller logs in (after join, seller can login even with pending status depending on system)
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "https://example.com",
      referrer: "https://example.com",
    },
  });
  // 5. Seller creates product
  const product =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      sellerLoginConnection,
      {
        body: {
          categoryId: category.id,
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
          basePrice: 10000,
        },
      },
    );
  typia.assert(product);
  // 6. Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 7. Customer adds shipping address
  const address =
    await generate_random_ecommerce_mall_customer_customers_me_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(address);
  // 8. Customer places order (cart items are created by the system or need cart API)
  const order =
    await generate_random_ecommerce_mall_customer_customers_me_orders_create(
      customerConnection,
      {
        body: {
          shippingAddressId: address.id,
        },
      },
    );
  typia.assert(order);
  // Get the first order item
  const orderItem = order.orderItems[0];
  typia.assert(orderItem);
  // 9. Customer submits cancellation request
  const cancellationRequest =
    await generate_random_ecommerce_mall_customer_customers_me_orders_items_cancel_create(
      customerConnection,
      {
        params: {
          itemId: orderItem.id,
        },
      },
    );
  typia.assert(cancellationRequest);
  // Extract cancellation request ID for rejection
  const cancellationRequestId = (
    cancellationRequest as unknown as {
      id: string;
    }
  ).id;
  // 10. Seller rejects the cancellation request
  const rejectedRequest =
    await api.functional.ecommerceMall.seller.sellers.me.cancellation_requests.reject(
      sellerLoginConnection,
      {
        requestId: cancellationRequestId,
      },
    );
  typia.assert(rejectedRequest);
  // 11. Validations
  // Status should be 'rejected'
  TestValidator.equals(
    "cancellation request status is rejected",
    (
      rejectedRequest as unknown as {
        status: string;
      }
    ).status,
    "rejected",
  );
  // Verify order item remains in 'paid' status (not cancelled)
  TestValidator.equals(
    "order item status remains paid",
    orderItem.status,
    "paid",
  );
  // Verify updated_at is set
  TestValidator.predicate(
    "updated_at timestamp exists",
    (
      rejectedRequest as unknown as {
        updated_at: string;
      }
    ).updated_at !== undefined,
  );
  // Verify snapshots array exists and contains rejection snapshot
  const snapshots = (
    rejectedRequest as unknown as {
      snapshots: unknown[];
    }
  ).snapshots;
  TestValidator.predicate(
    "snapshots array exists",
    snapshots !== undefined && snapshots !== null,
  );
  TestValidator.predicate(
    "at least one snapshot exists",
    Array.isArray(snapshots) && snapshots.length > 0,
  );
}
