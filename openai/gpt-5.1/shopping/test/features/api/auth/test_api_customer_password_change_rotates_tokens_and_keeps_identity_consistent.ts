import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";

/**
 * Verify that changing a customer password rotates JWT access tokens while
 * preserving the underlying customer identity in the authorization envelope.
 *
 * Steps:
 *
 * 1. Self-register a new customer through POST /auth/customer/join using
 *    IShoppingMallCustomerAuth.IJoin with realistic email, password, name and
 *    tracking URLs.
 * 2. Capture the returned IShoppingMallCustomer.IAuthorized, which includes both
 *    identity snapshot and IAuthorizationToken, and assert its shape via
 *    typia.assert.
 * 3. Perform an authenticated password change via POST
 *    /auth/customer/password/change using
 *    IShoppingMallCustomerAuth.IChangePassword where currentPassword equals the
 *    original join password and newPassword is a different value.
 * 4. Capture the resulting IShoppingMallCustomer.IAuthorized and assert that:
 *
 *    - The token.access value has changed (token rotation occurred).
 *    - Customer identity fields (id, email, name, status, isVerified, createdAt)
 *         remain logically consistent for the same account.
 *    - Timestamps remain valid (createdAt unchanged; updatedAt not earlier than
 *         createdAt).
 * 5. Do not attempt to manipulate connection.headers or to test explicit HTTP
 *    status codes; rely on the SDK to manage authentication context.
 */
export async function test_api_customer_password_change_rotates_tokens_and_keeps_identity_consistent(
  connection: api.IConnection,
) {
  // 1. Register (join) a new customer and get initial authorization envelope
  const initialPassword = RandomGenerator.alphabets(12);
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: initialPassword,
    name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const firstAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(firstAuth);

  const firstToken: IAuthorizationToken = firstAuth.token;
  const firstCustomerId = firstAuth.id;
  const firstEmail = firstAuth.email;
  const firstName = firstAuth.name;
  const firstStatus = firstAuth.status;
  const firstIsVerified = firstAuth.isVerified;
  const firstCreatedAt = firstAuth.createdAt;
  const firstUpdatedAt = firstAuth.updatedAt;

  // Basic invariants on initial envelope
  TestValidator.equals(
    "initial customer id equals summary id",
    firstAuth.customer.id,
    firstCustomerId,
  );
  TestValidator.predicate(
    "initial createdAt not empty",
    firstCreatedAt.length > 0,
  );
  TestValidator.predicate(
    "initial updatedAt not empty",
    firstUpdatedAt.length > 0,
  );

  // 2. Perform password change with correct current password and new password
  const newPassword = RandomGenerator.alphabets(14);
  const changeBody = {
    currentPassword: initialPassword,
    newPassword,
  } satisfies IShoppingMallCustomerAuth.IChangePassword;

  const secondAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.password.change.changePassword(
      connection,
      { body: changeBody },
    );
  typia.assert<IShoppingMallCustomer.IAuthorized>(secondAuth);

  const secondToken: IAuthorizationToken = secondAuth.token;

  // 3. Token rotation: access token must change
  TestValidator.notEquals(
    "access token must be rotated after password change",
    secondToken.access,
    firstToken.access,
  );

  // 4. Identity invariants across password change
  TestValidator.equals(
    "customer id remains the same after password change",
    secondAuth.id,
    firstCustomerId,
  );
  TestValidator.equals(
    "customer email remains the same after password change",
    secondAuth.email,
    firstEmail,
  );
  TestValidator.equals(
    "customer name remains the same after password change",
    secondAuth.name,
    firstName,
  );
  TestValidator.equals(
    "customer status remains the same after password change",
    secondAuth.status,
    firstStatus,
  );
  TestValidator.equals(
    "customer verification flag remains the same after password change",
    secondAuth.isVerified,
    firstIsVerified,
  );
  TestValidator.equals(
    "customer createdAt remains the same after password change",
    secondAuth.createdAt,
    firstCreatedAt,
  );

  // 5. Timestamp sanity: updatedAt must not be earlier than createdAt
  TestValidator.predicate(
    "initial updatedAt is not earlier than createdAt",
    new Date(firstUpdatedAt).getTime() >= new Date(firstCreatedAt).getTime(),
  );
  TestValidator.predicate(
    "updatedAt after password change is not earlier than createdAt",
    new Date(secondAuth.updatedAt).getTime() >=
      new Date(secondAuth.createdAt).getTime(),
  );

  // 6. Nested customer summary linkage remains consistent
  TestValidator.equals(
    "summary id remains consistent after password change",
    secondAuth.customer.id,
    firstAuth.customer.id,
  );
  TestValidator.predicate(
    "summary display_name remains non-empty after password change",
    secondAuth.customer.display_name.length > 0,
  );
}
