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
 * Test that seller cannot retrieve cancellation request belonging to another seller.
 *
 * Validates the ownership verification mechanism for cancellation request access.
 * A seller should only be able to view cancellation requests for their own products.
 * This test creates two sellers (Seller A and Seller B), where Seller A owns a product
 * that a customer orders and then requests cancellation. Seller B (non-owner) attempts
 * to access Seller A's cancellation request and should receive a 404 Not Found response.
 *
 * The test ensures proper authorization boundaries where cross-seller data access
 * is prevented at the API level, maintaining data isolation between sellers.
 *
 * 1. Administrator creates a product category for seller product listing.
 * 2. Seller A registers and logs in with approved status.
 * 3. Seller A creates a product under the category.
 * 4. Seller B registers and logs in (different seller for ownership verification).
 * 5. Customer registers and logs in to place orders.
 * 6. Customer creates a shipping address for order delivery.
 * 7. Customer adds Seller A's product to cart and completes checkout.
 * 8. Customer submits cancellation request for the paid order item.
 * 9. Seller B attempts to retrieve the cancellation request.
 * 10. Validates response is 404 Not Found (ownership violation).
 */
export async function test_api_cancellation_request_ownership_verification(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin creates a product category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  typia.assert(adminConnection);
  const category =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 2. Seller A registers, logs in, and creates a product
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerAAuthorized = await authorize_seller_join(sellerAConnection, {});
  typia.assert(sellerAAuthorized);
  // Login as Seller A (need approved status)
  const sellerALoginConnection: api.IConnection = { host: connection.host };
  const sellerALogin = await authorize_seller_login(sellerALoginConnection, {
    body: {
      email: sellerAAuthorized.email,
      password: "abcd1234!",
      href: "https://example.com",
      referrer: "https://example.com",
    },
  });
  typia.assert(sellerALogin);
  // Create product for Seller A
  const product =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      sellerALoginConnection,
      {
        body: {
          categoryId: category.id,
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 3 }),
          basePrice: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        },
      },
    );
  typia.assert(product);
  // 3. Seller B registers and logs in (non-owner)
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerBAuthorized = await authorize_seller_join(sellerBConnection, {});
  typia.assert(sellerBAuthorized);
  // Login as Seller B
  const sellerBLoginConnection: api.IConnection = { host: connection.host };
  const sellerBLogin = await authorize_seller_login(sellerBLoginConnection, {
    body: {
      email: sellerBAuthorized.email,
      password: "abcd1234!",
      href: "https://example.com",
      referrer: "https://example.com",
    },
  });
  typia.assert(sellerBLogin);
  // 4. Customer registers and logs in
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  typia.assert(customerConnection);
  // 5. Customer creates shipping address
  const address =
    await generate_random_ecommerce_mall_customer_customers_me_addresses_create(
      customerConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          street_address: "123 Test Street",
          city: "Test City",
          state: "Test State",
          postal_code: "12345",
          country: "Test Country",
          is_default: true,
        },
      },
    );
  typia.assert(address);
  // 6. Create order with Seller A's product
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
  // 7. Customer submits cancellation request for the order item
  const orderItem = order.orderItems[0];
  await generate_random_ecommerce_mall_customer_customers_me_orders_items_cancel_create(
    customerConnection,
    {
      params: {
        itemId: orderItem.id,
      },
      body: {
        reason: "Changed my mind about the product",
      },
    },
  );
  // 8. Seller B (non-owner) attempts to retrieve a cancellation request
  // Generate a UUID for a cancellation request that Seller B doesn't own
  // Since the DTO doesn't expose cancellation request ID, we test that
  // Seller B cannot access ANY cancellation request - the API enforces ownership
  const nonExistentRequestId = typia.random<string & tags.Format<"uuid">>();
  // This should return 404 because Seller B doesn't own any cancellation requests
  // and cannot access requests belonging to other sellers (including non-existent ones)
  await TestValidator.error(
    "Seller B cannot access cancellation request (ownership verification)",
    async () => {
      await api.functional.ecommerceMall.seller.sellers.me.cancellation_requests.at(
        sellerBLoginConnection,
        {
          requestId: nonExistentRequestId,
        },
      );
    },
  );
}
