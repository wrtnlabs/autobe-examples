import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
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

export async function test_api_customer_registration_with_unique_email(
  connection: api.IConnection,
): Promise<void> {
  // Generate unique email to avoid conflicts
  const uniqueEmail = `customer_${Date.now()}_${Math.random().toString(36).substring(7)}@test.com`;
  // Call customer join endpoint using utility function
  const authorized: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(connection, {
      body: {
        email: uniqueEmail as string & tags.Format<"email">,
        password: "TestPassword123!",
        href: "https://example.com/register" as string & tags.Format<"uri">,
        referrer: "https://example.com" as string & tags.Format<"uri">,
      },
    });
  // Validate complete response structure with typia
  typia.assert(authorized);
  // Validate email matches input
  TestValidator.equals("email matches input", authorized.email, uniqueEmail);
  // Validate customer ID exists and is UUID format
  TestValidator.predicate(
    "customer ID is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      authorized.id,
    ),
  );
  // Validate profile is initialized
  TestValidator.equals(
    "profile display_name is empty",
    authorized.profile.display_name,
    "",
  );
  // Phone must be at least 10 characters (MinLength<10> constraint)
  TestValidator.predicate(
    "profile phone has minimum length",
    authorized.profile.phone.length >= 10,
  );
  // Validate customer is active (not deleted)
  TestValidator.equals("customer is active", authorized.deleted_at, null);
  // Validate all related arrays are empty for new customer
  TestValidator.equals(
    "shipping addresses empty",
    authorized.shippingAddresses,
    [],
  );
  TestValidator.equals("orders empty", authorized.orders, []);
  TestValidator.equals("reviews empty", authorized.reviews, []);
  TestValidator.equals(
    "cancellation requests empty",
    authorized.cancellationRequests,
    [],
  );
  TestValidator.equals("refund requests empty", authorized.refundRequests, []);
  // Validate wishlist is initialized (object type, not null)
  TestValidator.predicate("wishlist exists", authorized.wishlist !== null);
  TestValidator.predicate(
    "wishlist is object",
    typeof authorized.wishlist === "object",
  );
  // Validate cart is initialized (object type, not null)
  TestValidator.predicate("cart exists", authorized.cart !== null);
  TestValidator.predicate(
    "cart is object",
    typeof authorized.cart === "object",
  );
  // Validate token structure
  TestValidator.predicate(
    "access token exists",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid ISO date",
    !isNaN(Date.parse(authorized.token.expired_at)),
  );
  TestValidator.predicate(
    "refreshable_until is valid ISO date",
    !isNaN(Date.parse(authorized.token.refreshable_until)),
  );
  // Verify password is NOT returned in response (security check)
  TestValidator.error("password not in response", () => {
    if ("password" in authorized)
      throw new Error("Password should not be returned");
    if ("passwordHash" in authorized)
      throw new Error("Password hash should not be returned");
  });
  // Validate profile customer reference matches authorized customer
  TestValidator.equals(
    "profile customer matches",
    authorized.profile.customer.id,
    authorized.id,
  );
  TestValidator.equals(
    "profile customer email matches",
    authorized.profile.customer.email,
    uniqueEmail,
  );
  TestValidator.equals(
    "profile customer status is active",
    authorized.profile.customer.status,
    "active",
  );
}
