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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test that an administrator can view complete customer account details.
 *
 * Validates administrative oversight capabilities by verifying that an authenticated administrator can successfully retrieve full customer account information through the admin customer details endpoint. The test ensures that administrators have visibility into customer accounts including profile data, associated addresses, wishlist, cart, orders, reviews, and any active cancellation or refund requests.
 *
 * **Test Flow:**
 *
 * 1. Administrator registration: Creates a new admin account to simulate admin user
 * 2. Customer registration: Creates a new customer account to be viewed by admin
 * 3. Admin view: Administrator retrieves customer details using customer UUID
 * 4. Validation: Confirms response contains complete customer data matching registered email and profile
 *
 * This test validates that the administrative user management feature works correctly, ensuring proper authorization and data access patterns for platform oversight operations.
 *
 * 1.1. Register admin via POST /ecommerceMall/auth/admin/join
 * 1.2. Register customer via POST /ecommerceMall/auth/customer/join
 * 1.3. Admin calls GET /ecommerceMall/admin/admin/customers/{customerId}
 * 1.4. Validate response contains complete IEcommerceMallCustomer with all fields
 * 1.5. Validate customer email matches registered email
 * 1.6. Validate profile contains display_name and phone
 * 1.7. Validate deleted_at is null (active account)
 */
export async function test_api_customer_account_viewing_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Register customer and capture their details
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  // 3. Administrator retrieves customer account details
  const customer = await api.functional.ecommerceMall.admin.admin.customers.at(
    adminConnection,
    {
      customerId: customerAuth.id,
    },
  );
  typia.assert(customer);
  // 4. Validate customer account details
  TestValidator.equals("customer id matches", customer.id, customerAuth.id);
  TestValidator.equals(
    "customer email matches",
    customer.email,
    customerAuth.email,
  );
  TestValidator.equals(
    "account is active (not deleted)",
    customer.deletedAt,
    null,
  );
  TestValidator.predicate("profile exists", !!customer.profile);
  TestValidator.equals(
    "profile display_name exists",
    !!customer.profile.display_name,
    true,
  );
  TestValidator.equals("profile phone exists", !!customer.profile.phone, true);
  TestValidator.predicate(
    "shipping addresses array exists",
    Array.isArray(customer.shippingAddresses),
  );
  TestValidator.predicate("wishlist exists", !!customer.wishlist);
  TestValidator.predicate("cart exists", !!customer.cart);
  TestValidator.predicate(
    "orders array exists",
    Array.isArray(customer.orders),
  );
  TestValidator.predicate(
    "reviews array exists",
    Array.isArray(customer.reviews),
  );
  TestValidator.predicate(
    "cancellation requests array exists",
    Array.isArray(customer.cancellationRequests),
  );
  TestValidator.predicate(
    "refund requests array exists",
    Array.isArray(customer.refundRequests),
  );
}
