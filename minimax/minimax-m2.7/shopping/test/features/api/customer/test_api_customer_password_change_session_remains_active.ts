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
 * Test that the customer's session remains active after a successful password change.
 *
 * Validates the complete password change flow ensuring that:
 * - The customer can change their password successfully
 * - The existing session/token remains valid after password change
 * - The customer does not need to re-authenticate
 * - The updated_at timestamp is refreshed on password change
 *
 * This test verifies that the JWT token validity is not invalidated by password change,
 * allowing customers to continue operations without disruption. The scenario follows
 * the secure pattern where password changes do not force session termination.
 *
 * 1. Register a new customer account with initial credentials
 * 2. Use the authenticated session to change password
 * 3. Verify the password change response contains valid customer data
 * 4. Verify the same token remains valid for subsequent operations
 * 5. Confirm updated_at timestamp is refreshed after password change
 * 6. Verify session remains active by performing another authenticated operation
 */
export async function test_api_customer_password_change_session_remains_active(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer with initial credentials
  const initialPassword = RandomGenerator.alphaNumeric(12);
  const customerConnection: api.IConnection = { host: connection.host };
  const registeredCustomer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: initialPassword,
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Store original updatedAt timestamp for comparison
  const originalUpdatedAt = registeredCustomer.updatedAt;
  // 2. Change password to a new value using authenticated connection
  const newPassword = RandomGenerator.alphaNumeric(16);
  const updatedCustomer =
    await api.functional.ecommerceMall.customer.customer.password.update(
      customerConnection,
      {
        body: {
          currentPassword: initialPassword,
          newPassword: newPassword,
        } satisfies IEcommerceMallCustomer.IUpdate,
      },
    );
  // 3. Validate password change response contains valid customer data
  typia.assert(updatedCustomer);
  TestValidator.equals(
    "customer id preserved",
    updatedCustomer.id,
    registeredCustomer.id,
  );
  TestValidator.equals(
    "email preserved",
    updatedCustomer.email,
    registeredCustomer.email,
  );
  // 4. Verify the token remains valid (session not invalidated by password change)
  const tokenAfterPasswordChange = customerConnection.headers?.Authorization;
  TestValidator.predicate(
    "token exists after password change",
    typeof tokenAfterPasswordChange === "string" &&
      tokenAfterPasswordChange.length > 0,
  );
  // 5. Confirm updated_at timestamp is refreshed after password change
  const newUpdatedAt = updatedCustomer.updatedAt;
  TestValidator.predicate(
    "updated_at timestamp is refreshed after password change",
    newUpdatedAt > originalUpdatedAt,
  );
  // 6. Session remains active - verify by performing another password change
  // This proves the token is still valid and customer can continue operations
  const finalPassword = RandomGenerator.alphaNumeric(16);
  const finalUpdate =
    await api.functional.ecommerceMall.customer.customer.password.update(
      customerConnection,
      {
        body: {
          currentPassword: newPassword,
          newPassword: finalPassword,
        } satisfies IEcommerceMallCustomer.IUpdate,
      },
    );
  typia.assert(finalUpdate);
  TestValidator.predicate(
    "session remains active for subsequent operations",
    finalUpdate.updatedAt > newUpdatedAt,
  );
}
