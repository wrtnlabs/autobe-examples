import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";
import type { IShoppingMallSellerPasswordChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPasswordChange";

export async function test_api_seller_password_change_with_incorrect_current_password(
  connection: api.IConnection,
) {
  // 1. Register a new seller with a known password.
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const originalPassword = RandomGenerator.alphaNumeric(12);

  const joinBody = {
    email,
    password: originalPassword,
    storeName: RandomGenerator.name(),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const joined: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(joined);

  // 2. Attempt password change with incorrect currentPassword.
  const incorrectCurrentPassword = `${originalPassword}_wrong`;
  const newPassword = RandomGenerator.alphaNumeric(16);

  const changeRequest = {
    currentPassword: incorrectCurrentPassword,
    newPassword,
  } satisfies IShoppingMallSellerPasswordChange.IRequest;

  const changeResult: IShoppingMallSellerPasswordChange.IResponse =
    await api.functional.auth.seller.password.change.changePassword(
      connection,
      { body: changeRequest },
    );
  typia.assert<IShoppingMallSellerPasswordChange.IResponse>(changeResult);

  // Business assertions on failed password change.
  TestValidator.equals(
    "password change with incorrect current password should fail",
    changeResult.success,
    false,
  );
  TestValidator.predicate(
    "failure message should be non-empty",
    changeResult.message.length > 0,
  );
  TestValidator.predicate(
    "errorCode should be present when password change fails",
    changeResult.errorCode !== undefined &&
      changeResult.errorCode !== null &&
      changeResult.errorCode.length > 0,
  );

  // 3. Login with original password must still succeed.
  const loginWithOriginalBody = {
    email,
    password: originalPassword,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const reauthenticated: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: loginWithOriginalBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(reauthenticated);

  TestValidator.equals(
    "seller id should remain the same after failed password change",
    reauthenticated.id,
    joined.id,
  );

  // 4. Optional: verify that login with the newPassword fails.
  const loginWithNewPasswordBody = {
    email,
    password: newPassword,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerLogin.IRequest;

  await TestValidator.error(
    "login with new password after failed change should be rejected",
    async () => {
      await api.functional.auth.seller.login(connection, {
        body: loginWithNewPasswordBody,
      });
    },
  );
}
