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

/**
 * Test retrieving a customer's shopping cart when no items have been added.
 *
 * Validates the empty cart edge case where the cart structure exists but contains no items. This test confirms the business rule that each customer has exactly one cart created upon registration, even before adding any products. The cart should return a valid structure with empty items array and zero total.
 *
 * Test Steps:
 * 1. Register a new customer account using POST /ecommerceMall/auth/customer/join
 * 2. Immediately retrieve the cart using GET /ecommerceMall/customer/customers/me/cart without adding any items
 *
 * Validation Points:
 * - Response returns HTTP 200 with valid cart structure (NOT 404)
 * - Cart contains the customer context (customer ID, email, profile)
 * - Items array is empty (not null, but an empty array [])
 * - Cart total equals 0
 * - Response includes cart timestamps (createdAt, updatedAt)
 * - Cart structure matches IEcommerceMallCart schema with all required fields present
 */
export async function test_api_cart_retrieval_empty_cart(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // 2. Retrieve the empty cart
  const cart =
    await api.functional.ecommerceMall.customer.customers.me.cart.at(
      customerConnection,
    );
  typia.assert(cart);
  // 3. Validate cart structure
  // Response should be HTTP 200 (valid cart structure), NOT 404
  // Cart should have an id
  TestValidator.equals("cart has valid UUID", cart.id.length, 36);
  // Cart should contain customer context
  TestValidator.equals(
    "cart belongs to correct customer",
    cart.customer.id,
    customer.id,
  );
  TestValidator.equals(
    "cart customer email matches",
    cart.customer.email,
    customer.email,
  );
  // Items array should be empty, not null
  TestValidator.equals("items array is empty", cart.items.length, 0);
  // Cart total should be 0
  TestValidator.equals("cart total is zero", cart.total, 0);
  // Cart should have timestamps
  TestValidator.predicate(
    "cart has createdAt timestamp",
    cart.createdAt.length > 0,
  );
  TestValidator.predicate(
    "cart has updatedAt timestamp",
    cart.updatedAt.length > 0,
  );
  // Customer profile should be present
  TestValidator.predicate("customer has profile", !!cart.customer.profile);
}
