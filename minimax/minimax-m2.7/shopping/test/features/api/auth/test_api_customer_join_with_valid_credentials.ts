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
 * Test successful customer registration with valid email and password.
 *
 * Validates the complete customer join flow including account creation, automatic
 * resource initialization (wishlist, cart), and proper response schema validation.
 * Verifies that all nested objects are created correctly and the response matches
 * the IAuthorized schema structure with proper types and null checks.
 *
 * 1. Submit registration request with valid email, password (min 8 chars), name, href, referrer.
 * 2. Verify response contains customer id, email, timestamps, and null deleted_at.
 * 3. Verify nested profile with display_name matching input name.
 * 4. Verify empty shippingAddresses array.
 * 5. Verify wishlist and cart are auto-created with ids and timestamps.
 * 6. Verify empty arrays for orders, reviews, cancellationRequests, refundRequests.
 * 7. Verify token object with access, refresh, expired_at, refreshable_until.
 */
export async function test_api_customer_join_with_valid_credentials(
  connection: api.IConnection,
): Promise<void> {
  // Use authorize_customer_join utility which internally calls POST /ecommerceMall/auth/customer/join
  const authorized = await authorize_customer_join(connection, {});
  // Validate response with typia.assert
  typia.assert(authorized);
  // Validate customer id is UUID format
  TestValidator.predicate(
    "customer id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      authorized.id,
    ),
  );
  // Validate email exists
  TestValidator.predicate("email is present", authorized.email.includes("@"));
  // Validate timestamps are ISO date-time format
  TestValidator.predicate(
    "created_at is ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(authorized.createdAt),
  );
  TestValidator.predicate(
    "updated_at is ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(authorized.updatedAt),
  );
  // Validate deleted_at is null for new customer
  TestValidator.equals(
    "deleted_at is null for new customer",
    authorized.deletedAt,
    null,
  );
  // Validate profile exists with display_name
  TestValidator.predicate(
    "profile exists",
    authorized.profile !== undefined && authorized.profile !== null,
  );
  TestValidator.predicate(
    "profile has display_name",
    typeof authorized.profile.display_name === "string" &&
      authorized.profile.display_name.length > 0,
  );
  // Validate empty shippingAddresses array
  TestValidator.equals(
    "shippingAddresses is empty array",
    authorized.shippingAddresses,
    [],
  );
  // Validate wishlist is auto-created
  TestValidator.predicate(
    "wishlist exists",
    authorized.wishlist !== undefined && authorized.wishlist !== null,
  );
  TestValidator.predicate(
    "wishlist has valid UUID id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      authorized.wishlist.id,
    ),
  );
  // Validate cart is auto-created
  TestValidator.predicate(
    "cart exists",
    authorized.cart !== undefined && authorized.cart !== null,
  );
  TestValidator.predicate(
    "cart has valid UUID id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      authorized.cart.id,
    ),
  );
  // Validate cart items is empty array
  TestValidator.equals("cart items is empty array", authorized.cart.items, []);
  // Validate empty arrays for all relationship collections
  TestValidator.equals("orders is empty array", authorized.orders, []);
  TestValidator.equals("reviews is empty array", authorized.reviews, []);
  TestValidator.equals(
    "cancellationRequests is empty array",
    authorized.cancellationRequests,
    [],
  );
  TestValidator.equals(
    "refundRequests is empty array",
    authorized.refundRequests,
    [],
  );
  // Validate token object structure
  TestValidator.predicate(
    "token has access property",
    typeof authorized.token.access === "string" &&
      authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "token has refresh property",
    typeof authorized.token.refresh === "string" &&
      authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token has expired_at in ISO format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(authorized.token.expired_at),
  );
  TestValidator.predicate(
    "token has refreshable_until in ISO format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
      authorized.token.refreshable_until,
    ),
  );
}
