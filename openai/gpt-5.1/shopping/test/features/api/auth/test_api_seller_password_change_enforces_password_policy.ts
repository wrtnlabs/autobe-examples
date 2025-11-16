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
 * Verify seller password change enforces password policy and preserves
 * credentials on failure.
 *
 * Business goals:
 *
 * - Ensure that POST /auth/seller/password/change validates the new password
 *   against platform policy (length/complexity) and rejects weak passwords.
 * - Confirm that when the password change is rejected due to policy, the seller's
 *   existing credentials remain valid and untouched.
 * - Confirm that a subsequent compliant password can be set successfully, and
 *   that the old password stops working after a successful change.
 *
 * Scenario steps:
 *
 * 1. Register a fresh seller account using /auth/seller/join with a strong initial
 *    password (e.g., long string with mixed characters) so that registration
 *    itself cannot fail due to password policy.
 * 2. While authenticated as that seller, call /auth/seller/password/change with
 *    currentPassword equal to the original strong password and newPassword
 *    equal to a clearly weak password (e.g., "12345").
 *
 *    - Expect IShoppingMallSellerPasswordChange.IResponse where success is false.
 *    - ErrorCode should be present (not undefined) and message should be non-empty.
 *         The exact errorCode (e.g., "WEAK_NEW_PASSWORD") is not asserted
 *         because no enum or literal set is specified in the DTO.
 * 3. Call /auth/seller/login with the original password and ensure login still
 *    succeeds (typia.assert on IShoppingMallSeller.IAuthorized), proving that
 *    credentials were not updated when policy validation failed.
 * 4. Perform a successful password change by calling /auth/seller/password/change
 *    again, this time with a strong newPassword.
 *
 *    - Assert the response has success === true and errorCode === undefined.
 * 5. Verify login behavior after successful change:
 *
 *    - Login with the new password should succeed.
 *    - Login with the old password should now fail. Use TestValidator.error with an
 *         async closure calling login with the old password, without checking
 *         any specific HTTP status codes or error messages.
 *
 * Implementation notes:
 *
 * - Use RandomGenerator and typia.random to generate unique emails and strong
 *   passwords. Strong passwords can be created by concatenating multiple random
 *   fragments (letters, digits, symbols) to increase length and complexity.
 * - Use only the following DTOs:
 *
 *   - IShoppingMallSellerJoin.IRequest
 *   - IShoppingMallSeller.IAuthorized
 *   - IShoppingMallSellerLogin.IRequest
 *   - IShoppingMallSellerPasswordChange.IRequest
 *   - IShoppingMallSellerPasswordChange.IResponse
 * - Use the following SDK functions only:
 *
 *   - Api.functional.auth.seller.join
 *   - Api.functional.auth.seller.login
 *   - Api.functional.auth.seller.password.change.changePassword
 * - Always await API calls, assert non-void responses with typia.assert, and use
 *   TestValidator for business logic checks (titles required on each
 *   assertion).
 */
export async function test_api_seller_password_change_enforces_password_policy(
  connection: api.IConnection,
) {
  // 1. Register seller with a strong initial password
  const email: string = typia.random<string & tags.Format<"email">>();
  const strongInitialPassword: string = `${RandomGenerator.alphaNumeric(8)}!A1${RandomGenerator.alphaNumeric(8)}`;

  const joinBody = {
    email,
    password: strongInitialPassword,
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const joinedSeller = await api.functional.auth.seller.join(connection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallSeller.IAuthorized>(joinedSeller);

  // 2. Attempt weak new password change
  const weakPassword = "12345";
  const weakChangeBody = {
    currentPassword: strongInitialPassword,
    newPassword: weakPassword,
  } satisfies IShoppingMallSellerPasswordChange.IRequest;

  const weakChangeResponse =
    await api.functional.auth.seller.password.change.changePassword(
      connection,
      { body: weakChangeBody },
    );
  typia.assert<IShoppingMallSellerPasswordChange.IResponse>(weakChangeResponse);

  TestValidator.equals(
    "weak password change should fail (success=false)",
    weakChangeResponse.success,
    false,
  );
  TestValidator.predicate(
    "weak password change should return non-empty message",
    typeof weakChangeResponse.message === "string" &&
      weakChangeResponse.message.length > 0,
  );
  TestValidator.predicate(
    "weak password change should provide errorCode",
    weakChangeResponse.errorCode !== undefined,
  );

  // 3. Login with original password must still succeed
  const loginWithOriginalBody = {
    email,
    password: strongInitialPassword,
    ip: null,
    href: "https://seller-portal.example.com/login",
    referrer: "https://seller-portal.example.com/",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const loginOriginal = await api.functional.auth.seller.login(connection, {
    body: loginWithOriginalBody,
  });
  typia.assert<IShoppingMallSeller.IAuthorized>(loginOriginal);

  // 4. Perform successful password change with strong new password
  const strongNewPassword: string = `${RandomGenerator.alphaNumeric(10)}#Z9${RandomGenerator.alphaNumeric(10)}`;
  const strongChangeBody = {
    currentPassword: strongInitialPassword,
    newPassword: strongNewPassword,
  } satisfies IShoppingMallSellerPasswordChange.IRequest;

  const strongChangeResponse =
    await api.functional.auth.seller.password.change.changePassword(
      connection,
      { body: strongChangeBody },
    );
  typia.assert<IShoppingMallSellerPasswordChange.IResponse>(
    strongChangeResponse,
  );

  TestValidator.equals(
    "strong password change should succeed (success=true)",
    strongChangeResponse.success,
    true,
  );
  TestValidator.equals(
    "strong password change should not have errorCode",
    strongChangeResponse.errorCode,
    undefined,
  );

  // 5a. Login with new password should succeed
  const loginWithNewBody = {
    email,
    password: strongNewPassword,
    ip: null,
    href: "https://seller-portal.example.com/login",
    referrer: "https://seller-portal.example.com/",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const loginNew = await api.functional.auth.seller.login(connection, {
    body: loginWithNewBody,
  });
  typia.assert<IShoppingMallSeller.IAuthorized>(loginNew);

  // 5b. Login with old password should now fail
  await TestValidator.error(
    "login with old password after successful change should fail",
    async () => {
      const staleLoginBody = {
        email,
        password: strongInitialPassword,
        ip: null,
        href: "https://seller-portal.example.com/login",
        referrer: "https://seller-portal.example.com/",
      } satisfies IShoppingMallSellerLogin.IRequest;

      await api.functional.auth.seller.login(connection, {
        body: staleLoginBody,
      });
    },
  );
}
