import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
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

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_customer_customers_me_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_addresses_create";
import { generate_random_ecommerce_mall_customer_customers_me_cart_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_cart_create";
import { generate_random_ecommerce_mall_customer_customers_me_orders_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_orders_create";
import { generate_random_ecommerce_mall_customer_customers_me_orders_items_review_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_orders_items_review_create";
import { prepare_random_ecommerce_mall_cart } from "../../../prepare/prepare_random_ecommerce_mall_cart";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_review } from "../../../prepare/prepare_random_ecommerce_mall_review";
import { prepare_random_ecommerce_mall_shipping_address } from "../../../prepare/prepare_random_ecommerce_mall_shipping_address";

/**
 * Test that a customer cannot delete another customer's review and receives 403 Forbidden.
 *
 * Validates the review ownership enforcement mechanism where only the author of a review
 * can delete it. This test ensures proper authorization checks prevent unauthorized
 * deletion attempts by other customers.
 *
 * **Setup Flow**:
 * 1. Seller registers to create products
 * 2. Customer A purchases a product and creates a review
 * 3. Customer B registers (different account)
 *
 * **Test Execution**:
 * Customer B attempts to delete Customer A's review
 *
 * **Security Validations**:
 * - HTTP 403 Forbidden is returned when non-owner attempts deletion
 * - Server-side ownership verification prevents unauthorized access
 *
 * 1. Seller registers
 * 2. Customer A registers and creates review
 * 3. Customer B registers
 * 4. Customer B attempts to delete Customer A's review
 * 5. Validates 403 Forbidden response
 */
export async function test_api_review_deletion_by_non_owner_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration (for product context)
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Customer A registration
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA = await authorize_customer_join(customerAConnection, {});
  typia.assert(customerA);
  // Customer A creates shipping address
  const address =
    await generate_random_ecommerce_mall_customer_customers_me_addresses_create(
      customerAConnection,
      {},
    );
  // Customer A creates cart with variant (using mock variant ID for structure)
  const cartItem =
    await generate_random_ecommerce_mall_customer_customers_me_cart_create(
      customerAConnection,
      {
        body: {
          variantId: typia.random<string & tags.Format<"uuid">>(),
          quantity: 1,
        },
      },
    );
  typia.assert(cartItem);
  // Customer A creates order
  const order =
    await generate_random_ecommerce_mall_customer_customers_me_orders_create(
      customerAConnection,
      {
        body: {
          shippingAddressId: address.id,
        },
      },
    );
  typia.assert(order);
  // Get order item for review
  const orderItem = order.orderItems[0];
  typia.assert(orderItem);
  // Customer A creates review for order item
  const review =
    await generate_random_ecommerce_mall_customer_customers_me_orders_items_review_create(
      customerAConnection,
      {
        params: {
          itemId: orderItem.id,
        },
      },
    );
  typia.assert(review);
  // 3. Customer B registration (different account)
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerB = await authorize_customer_join(customerBConnection, {});
  typia.assert(customerB);
  // 4. Customer B attempts to delete Customer A's review
  // This should return 403 Forbidden as Customer B does not own the review
  await TestValidator.httpError(
    "Customer B cannot delete Customer A's review",
    403,
    async () => {
      await api.functional.ecommerceMall.customer.customers.me.reviews.erase(
        customerBConnection,
        {
          reviewId: review.id,
        },
      );
    },
  );
  // Verify review ownership - review belongs to Customer A
  TestValidator.predicate(
    "Review belongs to Customer A",
    customerA.id === review.customer.id,
  );
  TestValidator.notEquals(
    "Review does not belong to Customer B",
    review.customer.id,
    customerB.id,
  );
}
