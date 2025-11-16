import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";

/**
 * Validate successful password change for a freshly joined, authenticated
 * customer.
 *
 * Business intent:
 *
 * - A new customer self-registers via /auth/customer/join and receives an
 *   IShoppingMallCustomer.IAuthorized envelope with JWT tokens.
 * - Immediately after registration (conceptually after email verification), the
 *   authenticated customer changes their password using
 *   /auth/customer/password/change.
 * - The password change should succeed, and the returned authorization envelope
 *   must still represent the same logical customer identity while optionally
 *   rotating tokens.
 *
 * End-to-end steps:
 *
 * 1. Join as a new customer using api.functional.auth.customer.join with
 *    IShoppingMallCustomerAuth.IJoin payload.
 * 2. Capture the returned IShoppingMallCustomer.IAuthorized as the pre-change
 *    authorization snapshot.
 * 3. Call api.functional.auth.customer.password.change.changePassword with
 *    IShoppingMallCustomerAuth.IChangePassword where currentPassword matches
 *    the original password and newPassword is different.
 * 4. Assert that the response is a valid IShoppingMallCustomer.IAuthorized and
 *    that core identity fields (id, email, name, status, isVerified, createdAt,
 *    updatedAt) match between pre- and post-change envelopes.
 */
export async function test_api_customer_password_change_success_after_join_and_email_verification(
  connection: api.IConnection,
) {
  // 1. Join as a new customer
  const originalPassword = RandomGenerator.alphaNumeric(16);
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: originalPassword,
    name: RandomGenerator.name(),
    ip: undefined,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const beforeChange: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert(beforeChange);

  // 2. Change password using the authenticated context
  const newPassword = RandomGenerator.alphaNumeric(18);
  const changeBody = {
    currentPassword: originalPassword,
    newPassword,
  } satisfies IShoppingMallCustomerAuth.IChangePassword;

  const afterChange: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.password.change.changePassword(
      connection,
      { body: changeBody },
    );
  typia.assert(afterChange);

  // 3. Business invariants: customer identity must remain the same
  TestValidator.equals(
    "customer id stays the same after password change",
    afterChange.id,
    beforeChange.id,
  );
  TestValidator.equals(
    "customer email stays the same after password change",
    afterChange.email,
    beforeChange.email,
  );
  TestValidator.equals(
    "customer name stays the same after password change",
    afterChange.name,
    beforeChange.name,
  );
  TestValidator.equals(
    "customer status stays the same after password change",
    afterChange.status,
    beforeChange.status,
  );
  TestValidator.equals(
    "customer isVerified flag remains consistent after password change",
    afterChange.isVerified,
    beforeChange.isVerified,
  );
  TestValidator.equals(
    "customer createdAt timestamp remains unchanged after password change",
    afterChange.createdAt,
    beforeChange.createdAt,
  );
  TestValidator.equals(
    "customer updatedAt timestamp remains unchanged after password change",
    afterChange.updatedAt,
    beforeChange.updatedAt,
  );

  // 4. Token structure remains valid; we do not require equality
  typia.assert<IAuthorizationToken>(beforeChange.token);
  typia.assert<IAuthorizationToken>(afterChange.token);
}
