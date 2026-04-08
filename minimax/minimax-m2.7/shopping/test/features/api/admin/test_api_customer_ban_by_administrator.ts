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
 * Test that an administrator can successfully ban an active customer account for policy violations.
 *
 * Validates the complete customer ban workflow including administrative authentication, customer account creation, ban execution, and response validation. Ensures that when an administrator bans a customer, the customer account's deletedAt timestamp is set (soft-delete/banned status) while preserving all customer data including email and profile information.
 *
 * This test verifies the core administrative control over customer accounts - administrators can deactivate customer accounts for policy violations while preserving the data for audit and record-keeping purposes. The soft-delete approach ensures that customer orders, reviews, and other business records remain intact.
 *
 * 1. Administrator registers and authenticates to obtain admin JWT token.
 * 2. Customer registers to create an active account with null deletedAt.
 * 3. Admin calls ban endpoint with customer ID.
 * 4. Validates response contains customer data with non-null deletedAt (banned status).
 * 5. Validates email and profile information are preserved in the response.
 */
export async function test_api_customer_ban_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Register a customer to be banned
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  const customerId = customerAuth.id;
  // 3. Verify customer is currently active (deletedAt is null)
  TestValidator.equals(
    "customer should be active before ban",
    customerAuth.deletedAt,
    null,
  );
  // 4. Administrator bans the customer
  const bannedCustomer =
    await api.functional.ecommerceMall.admin.admin.customers.ban(
      adminConnection,
      { customerId },
    );
  typia.assert(bannedCustomer);
  // 5. Validate response has non-null deletedAt (banned status)
  TestValidator.predicate(
    "customer should be banned (deletedAt not null)",
    bannedCustomer.deletedAt !== null && bannedCustomer.deletedAt !== undefined,
  );
  // 6. Validate customer email is preserved
  TestValidator.equals(
    "customer email should be preserved",
    bannedCustomer.email,
    customerAuth.email,
  );
  // 7. Validate customer profile data is preserved
  TestValidator.predicate(
    "customer profile should exist",
    bannedCustomer.profile !== null && bannedCustomer.profile !== undefined,
  );
  TestValidator.equals(
    "customer profile display_name should match",
    bannedCustomer.profile.display_name,
    customerAuth.profile.display_name,
  );
}
