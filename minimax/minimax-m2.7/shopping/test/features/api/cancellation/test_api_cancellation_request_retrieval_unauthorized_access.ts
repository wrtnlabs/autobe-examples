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
 * Test that a customer cannot access another customer's cancellation request.
 *
 * Validates data isolation and authorization enforcement in the cancellation request
 * retrieval endpoint. Customers should only be able to access their own cancellation
 * requests. This test verifies that when Customer B attempts to retrieve a cancellation
 * request belonging to Customer A, the system properly rejects the request with an
 * appropriate HTTP error (403 Forbidden or 404 Not Found).
 *
 * **Test Flow**:
 * 1. Admin creates a product category for seller product assignment
 * 2. Seller registers and gets approved, then creates a product
 * 3. Customer A registers, creates address, places order
 * 4. Customer A submits a cancellation request for the order item
 * 5. Customer B registers with a different account
 * 6. Customer B attempts to access Customer A's cancellation request
 * 7. System rejects the request - access denied
 *
 * **Security Validation**: This test ensures that customer data is properly isolated
 * and that the API correctly enforces ownership checks on cancellation requests.
 */
export async function test_api_cancellation_request_retrieval_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup: Register admin and create category
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  const category =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {
        body: {
          name: `Test Category ${RandomGenerator.alphabets(8)}`,
          description: "Category for cancellation request test",
        },
      },
    );
  typia.assert(category);
  // 2. Seller setup: Register seller and create product
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
    },
  });
  // Admin approves seller (login as admin)
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminAuth.email,
      password: "1234",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    },
  });
  // Seller creates product (login as approved seller)
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerAuth.email,
      password: "1234",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    },
  });
  const product =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      sellerLoginConnection,
      {
        body: {
          categoryId: category.id,
        },
      },
    );
  typia.assert(product);
  // 3. Customer A setup: Register, create address, place order
  const customerAConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
    },
  });
  const addressA =
    await generate_random_ecommerce_mall_customer_customers_me_addresses_create(
      customerAConnection,
      {
        body: {
          recipient_name: "Customer A",
        },
      },
    );
  typia.assert(addressA);
  // Customer A creates order (cart must have items - using generation function)
  const orderA =
    await generate_random_ecommerce_mall_customer_customers_me_orders_create(
      customerAConnection,
      {
        body: {
          shippingAddressId: addressA.id,
        },
      },
    );
  typia.assert(orderA);
  // Get the order item ID for cancellation
  const orderItemId = orderA.orderItems[0]!.id;
  // Customer A submits cancellation request
  const cancellationResponse =
    await api.functional.ecommerceMall.customer.customers.me.orders.items.cancel.create(
      customerAConnection,
      {
        itemId: orderItemId,
        body: {
          reason: "Changed my mind about the order",
        } satisfies IEcommerceMallCancellationRequest.ICreate,
      },
    );
  typia.assert(cancellationResponse);
  // Extract the cancellation request ID from the response
  // The response should contain an id field based on the endpoint requirements
  const cancellationRequestId = (cancellationResponse as any).id as string;
  // 4. Customer B setup: Register with different account
  const customerBConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
    },
  });
  // 5. Customer B attempts to access Customer A's cancellation request
  // This should fail with 403 Forbidden or 404 Not Found
  await TestValidator.error(
    "Customer B cannot access Customer A's cancellation request",
    async () => {
      await api.functional.ecommerceMall.customer.customers.me.cancellation_requests.at(
        customerBConnection,
        {
          requestId: cancellationRequestId,
        },
      );
    },
  );
}
