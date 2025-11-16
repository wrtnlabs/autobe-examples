import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallCustomerCredential } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCredential";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";

/**
 * Validate that a platform administrator can retrieve a verified customer's
 * administrative credential view.
 *
 * Business workflow covered by this test:
 *
 * 1. Register a new platform administrator via /auth/platformAdmin/join to obtain
 *    an admin JWT session.
 * 2. Register a new customer via /auth/customer/join so that there is a concrete
 *    customer account in the system.
 * 3. Complete the customer's email-verification flow by calling
 *    /auth/customer/email/verify, and use the returned authorized customer
 *    envelope as the verified identity snapshot.
 * 4. Log back in as the platform administrator via /auth/platformAdmin/login to
 *    ensure the connection is in an admin context.
 * 5. Call GET /shoppingMall/platformAdmin/customers/{customerId}/credentials with
 *    the verified customer's id and assert that an
 *    IShoppingMallCustomerCredential payload is returned whose customer_id
 *    matches the path parameter and whose safe metadata fields are
 *    well-formed.
 */
export async function test_api_platform_admin_view_customer_credentials_after_email_verification(
  connection: api.IConnection,
) {
  // 1. Register a new platform administrator (also authenticates as that admin).
  const platformAdminEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const platformAdminPassword: string = "AdminPassword!234";
  const platformAdminHref: string = typia.random<string & tags.Format<"uri">>();
  const platformAdminReferrer: string = typia.random<
    string & tags.Format<"uri">
  >();

  const platformAdminJoinBody = {
    email: platformAdminEmail,
    name: RandomGenerator.name(),
    password: platformAdminPassword,
    ip: null,
    href: platformAdminHref,
    referrer: platformAdminReferrer,
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Register a new customer (this will switch the connection token
  //    context to the customer session).
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customerJoinBody = {
    email: customerEmail,
    password: "CustomerPassword!234",
    name: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorizedFromJoin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorizedFromJoin);

  // 3. Simulate email verification completion for the customer.
  // In a real system we would use an actual issued token; here we rely on the
  // contract and treat the response as the verified customer snapshot.
  const verifyEmailBody = {
    token: RandomGenerator.alphaNumeric(32),
  } satisfies IShoppingMallCustomerAuth.IVerifyEmail;

  const customerAuthorizedAfterVerification: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.email.verify.verifyEmail(connection, {
      body: verifyEmailBody,
    });
  typia.assert(customerAuthorizedAfterVerification);

  const verifiedCustomerId: string & tags.Format<"uuid"> =
    customerAuthorizedAfterVerification.id;

  // 4. Log back in as the platform administrator to restore admin context.
  const platformAdminLoginBody = {
    email: platformAdminEmail,
    password: platformAdminPassword,
    ip: null,
    href: platformAdminHref,
    referrer: platformAdminReferrer,
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const platformAdminAuthorizedFromLogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminAuthorizedFromLogin);

  // 5. As platform admin, retrieve the customer's credential view.
  const credentialView: IShoppingMallCustomerCredential =
    await api.functional.shoppingMall.platformAdmin.customers.credentials.at(
      connection,
      {
        customerId: verifiedCustomerId,
      },
    );
  typia.assert(credentialView);

  // 6. Business-level assertions on the credential DTO.
  TestValidator.equals(
    "credential customer_id matches requested customerId",
    credentialView.customer_id,
    verifiedCustomerId,
  );

  TestValidator.predicate(
    "login_identifier should be non-empty",
    credentialView.login_identifier.length > 0,
  );
  TestValidator.predicate(
    "credential_type should be non-empty",
    credentialView.credential_type.length > 0,
  );

  // These booleans are already type-validated by typia.assert, but we can
  // still assert expected default semantics for a fresh account: not locked
  // and MFA not yet enrolled.
  TestValidator.predicate(
    "newly created customer credential should not be locked by default",
    credentialView.is_locked === false,
  );
  TestValidator.predicate(
    "newly created customer credential should not have MFA enrolled by default",
    credentialView.mfa_enrolled === false,
  );
}
