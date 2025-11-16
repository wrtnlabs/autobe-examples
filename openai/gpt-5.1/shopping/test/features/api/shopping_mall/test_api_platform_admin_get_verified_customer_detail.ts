import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";

export async function test_api_platform_admin_get_verified_customer_detail(
  connection: api.IConnection,
) {
  // 1. Register a platform administrator (implicitly authenticates as admin)
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string = RandomGenerator.alphaNumeric(16);

  const adminJoinBody = {
    email: adminEmail,
    name: RandomGenerator.name(),
    password: adminPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorizedFromJoin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorizedFromJoin);

  // 2. Register a customer (this will switch Authorization to customer)
  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const customerPassword: string = RandomGenerator.alphaNumeric(16);

  const customerJoinBody = {
    email: customerEmail,
    password: customerPassword,
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

  const customerId: string & tags.Format<"uuid"> =
    customerAuthorizedFromJoin.id;

  // 3. Trigger password reset request for the customer
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
  typia.assert(resetResult);

  // Ensure reset result is a generic acknowledgement (status is one of allowed literals)
  TestValidator.predicate(
    "password reset acknowledgement status is accepted or processed",
    resetResult.status === "accepted" || resetResult.status === "processed",
  );

  // 4. Complete email verification for the customer
  // In a real system, token would come from an email; here we rely on random
  // or test harness token semantics.
  const verifyEmailBody = {
    token: RandomGenerator.alphaNumeric(32),
  } satisfies IShoppingMallCustomerAuth.IVerifyEmail;

  const customerAuthorizedAfterVerify: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.email.verify.verifyEmail(connection, {
      body: verifyEmailBody,
    });
  typia.assert(customerAuthorizedAfterVerify);

  // If isVerified is present on the authorized DTO, it should be true.
  if (customerAuthorizedAfterVerify.isVerified !== undefined) {
    TestValidator.predicate(
      "customer should be marked as verified after email verification",
      customerAuthorizedAfterVerify.isVerified === true,
    );
  }

  // 5. Switch back to platform admin via login
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const adminAuthorizedFromLogin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuthorizedFromLogin);

  // 6. As platform admin, retrieve the customer detail by id
  const customerDetail: IShoppingMallCustomer =
    await api.functional.shoppingMall.platformAdmin.customers.at(connection, {
      customerId,
    });
  typia.assert(customerDetail);

  // 7. Validate core fields and verify verification status
  TestValidator.equals(
    "admin view: customer id should match original customer id",
    customerDetail.id,
    customerId,
  );

  TestValidator.equals(
    "admin view: customer email should match original email",
    customerDetail.email,
    customerEmail,
  );

  TestValidator.predicate(
    "admin view: customer should be verified after email verification",
    customerDetail.isVerified === true,
  );

  // Ensure status is a non-empty string (business-lifecycle sanity)
  TestValidator.predicate(
    "admin view: customer status should be a non-empty string",
    typeof customerDetail.status === "string" &&
      customerDetail.status.trim().length > 0,
  );

  // Ensure createdAt and updatedAt are present; detailed format checks are
  // already handled by typia.assert, so we just ensure they are non-empty.
  TestValidator.predicate(
    "admin view: customer createdAt should be present",
    customerDetail.createdAt.length > 0,
  );

  TestValidator.predicate(
    "admin view: customer updatedAt should be present",
    customerDetail.updatedAt.length > 0,
  );

  // We implicitly validate that no password-reset-specific confidential
  // information is exposed by only touching the documented fields in
  // IShoppingMallCustomer. Trying to access any token-like fields would be a
  // TypeScript error and is intentionally avoided here.
}
