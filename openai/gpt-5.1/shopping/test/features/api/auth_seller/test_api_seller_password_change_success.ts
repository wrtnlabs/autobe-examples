import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";
import type { IShoppingMallSellerPasswordChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPasswordChange";

/**
 * Validate successful password change for an authenticated seller.
 *
 * Business goal
 *
 * - Ensure that a logged-in seller can change their password by providing the
 *   correct current password, and that subsequent authentication must use the
 *   new password.
 * - Confirm that identity fields (id, email, store_name, status) are not changed
 *   by a password change and that no sensitive credential data is exposed.
 *
 * High-level flow
 *
 * 1. Join as a new seller via POST /auth/seller/join to obtain an
 *    IShoppingMallSeller.IAuthorized session with JWT tokens.
 * 2. Call POST /auth/seller/password/change using the same connection (which now
 *    holds the Authorization header) with body satisfying
 *    IShoppingMallSellerPasswordChange.IRequest where:
 *
 *    - CurrentPassword equals the original plaintext password used on join.
 *    - NewPassword is a different string, treated as a valid password.
 * 3. Assert that the password-change response satisfies
 *    IShoppingMallSellerPasswordChange.IResponse and that:
 *
 *    - Success is true
 *    - Message is a non-empty string
 *    - ErrorCode is undefined (or absent)
 * 4. Immediately attempt login with the old password using POST /auth/seller/login
 *    and validate that it fails via TestValidator.error, without asserting
 *    specific HTTP status codes.
 * 5. Attempt login with the new password and validate that it succeeds, returning
 *    a fresh IShoppingMallSeller.IAuthorized structure.
 * 6. Verify that seller identity fields are preserved across join and the
 *    successful post-change login (id, email, store_name, status) while
 *    allowing token values and timestamps to differ.
 */
export async function test_api_seller_password_change_success(
  connection: api.IConnection,
) {
  // 1. Join as a new seller
  const joinPassword = "Password#1";
  const joinRequestBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: joinPassword,
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const joinedSeller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: joinRequestBody,
    });
  typia.assert(joinedSeller);

  // 2. Change password using authenticated context
  const newPassword = "Password#2";
  const changePasswordBody = {
    currentPassword: joinPassword,
    newPassword,
  } satisfies IShoppingMallSellerPasswordChange.IRequest;

  const changeResponse: IShoppingMallSellerPasswordChange.IResponse =
    await api.functional.auth.seller.password.change.changePassword(
      connection,
      {
        body: changePasswordBody,
      },
    );
  typia.assert(changeResponse);

  TestValidator.predicate(
    "password change response indicates success",
    changeResponse.success === true,
  );

  TestValidator.predicate(
    "password change response message is non-empty",
    changeResponse.message.length > 0,
  );

  TestValidator.equals(
    "password change errorCode should be undefined when success",
    changeResponse.errorCode,
    undefined,
  );

  // 3. Attempt login with the old password and expect failure
  const oldPasswordLoginBody = {
    email: joinedSeller.email,
    password: joinPassword,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerLogin.IRequest;

  await TestValidator.error(
    "login with old password must fail after password change",
    async () => {
      await api.functional.auth.seller.login(connection, {
        body: oldPasswordLoginBody,
      });
    },
  );

  // 4. Login with the new password and expect success
  const newPasswordLoginBody = {
    email: joinedSeller.email,
    password: newPassword,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const reloggedSeller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: newPasswordLoginBody,
    });
  typia.assert(reloggedSeller);

  // 5. Identity fields must remain stable across password change
  TestValidator.equals(
    "seller id remains the same after password change",
    reloggedSeller.id,
    joinedSeller.id,
  );

  TestValidator.equals(
    "seller email remains the same after password change",
    reloggedSeller.email,
    joinedSeller.email,
  );

  TestValidator.equals(
    "seller store_name remains the same after password change",
    reloggedSeller.store_name,
    joinedSeller.store_name,
  );

  TestValidator.equals(
    "seller status remains the same after password change",
    reloggedSeller.status,
    joinedSeller.status,
  );

  // 6. Sanity check: tokens from join and relogin are different instances
  TestValidator.notEquals<IAuthorizationToken, IAuthorizationToken>(
    "access token should change after re-login with new password",
    reloggedSeller.token,
    joinedSeller.token,
  );
}
