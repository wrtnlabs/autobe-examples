import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallCustomerCredential } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCredential";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate that a platform administrator can view a customer's credential
 * metadata after a password reset request and that the admin credentials
 * endpoint remains read-only and non-mutating.
 *
 * Business flow covered by this test:
 *
 * 1. Register a new platform admin via POST /auth/platformAdmin/join, which also
 *    issues an authorization token and binds it to the connection.
 * 2. Trigger a customer password reset request via POST
 *    /auth/customer/password/reset/request using a random email and verify the
 *    generic acknowledgement response.
 * 3. As the authenticated platform admin, call GET
 *    /shoppingMall/platformAdmin/customers/{customerId}/credentials for a
 *    random customerId and validate the returned
 *    IShoppingMallCustomerCredential view.
 * 4. Call the credentials endpoint again with the same customerId to ensure that
 *    it behaves idempotently and does not change credential state.
 *
 * Note: we do not have APIs to create or resolve a concrete customer for the
 * given email, so the password reset request and the chosen customerId are
 * logically independent in this test. The focus is on exercising the two
 * interaction surfaces and validating that the credential view is consistent
 * and read-only under admin access.
 */
export async function test_api_platform_admin_view_customer_credentials_after_password_reset_request(
  connection: api.IConnection,
) {
  // 1. Register a new platform administrator and obtain an authorized session
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(adminAuthorized);

  // Sanity check: token structure is present
  typia.assert<IAuthorizationToken>(adminAuthorized.token);

  // 2. Trigger a customer password reset request with a random login email
  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const resetRequestBody = {
    email: customerEmail,
  } satisfies IShoppingMallCustomerAuth.IRequestPasswordReset;

  const resetResult: IShoppingMallCustomerAuth.IRequestPasswordResetResult =
    await api.functional.auth.customer.password.reset.request.requestPasswordReset(
      connection,
      {
        body: resetRequestBody,
      },
    );
  typia.assert<IShoppingMallCustomerAuth.IRequestPasswordResetResult>(
    resetResult,
  );

  // Assert that the status is one of the allowed generic acknowledgement values
  TestValidator.predicate(
    "password reset result status is generic accepted/processed",
    resetResult.status === "accepted" || resetResult.status === "processed",
  );

  // 3. As platform admin, fetch credential view for a random customerId
  const customerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const credential1: IShoppingMallCustomerCredential =
    await api.functional.shoppingMall.platformAdmin.customers.credentials.at(
      connection,
      {
        customerId,
      },
    );
  typia.assert<IShoppingMallCustomerCredential>(credential1);

  // Basic invariants: the view must belong to the requested customerId
  TestValidator.equals(
    "credential view customer_id matches requested customerId",
    credential1.customer_id,
    customerId,
  );

  // Ensure key descriptive fields are non-empty strings
  TestValidator.predicate(
    "credential login_identifier is non-empty",
    credential1.login_identifier.length > 0,
  );
  TestValidator.predicate(
    "credential credential_type is non-empty",
    credential1.credential_type.length > 0,
  );

  // Optional numeric field: if present, failed_login_attempts should be >= 0
  if (credential1.failed_login_attempts !== undefined) {
    TestValidator.predicate(
      "failed_login_attempts is non-negative when present",
      credential1.failed_login_attempts >= 0,
    );
  }

  // 4. Call the credentials endpoint again to ensure idempotent, read-only behavior
  const credential2: IShoppingMallCustomerCredential =
    await api.functional.shoppingMall.platformAdmin.customers.credentials.at(
      connection,
      {
        customerId,
      },
    );
  typia.assert<IShoppingMallCustomerCredential>(credential2);

  // Core identity and configuration fields should remain stable
  TestValidator.equals(
    "customer_id remains stable across repeated credential views",
    credential2.customer_id,
    credential1.customer_id,
  );
  TestValidator.equals(
    "credential_id remains stable across repeated credential views",
    credential2.credential_id,
    credential1.credential_id,
  );
  TestValidator.equals(
    "login_identifier remains stable across repeated credential views",
    credential2.login_identifier,
    credential1.login_identifier,
  );
  TestValidator.equals(
    "credential_type remains stable across repeated credential views",
    credential2.credential_type,
    credential1.credential_type,
  );
  TestValidator.equals(
    "is_locked remains stable across repeated credential views",
    credential2.is_locked,
    credential1.is_locked,
  );
  TestValidator.equals(
    "mfa_enrolled remains stable across repeated credential views",
    credential2.mfa_enrolled,
    credential1.mfa_enrolled,
  );
}
