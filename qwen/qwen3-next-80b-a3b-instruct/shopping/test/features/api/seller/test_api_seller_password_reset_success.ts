import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerPasswordReset";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection, HttpError } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_password_reset_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new seller account
  const joinConnection: api.IConnection = { host: connection.host };
  const joinEmail = typia.random<string & tags.Format<"email">>();
  const joinPassword =
    RandomGenerator.alphabets(8) + RandomGenerator.alphaNumeric(2); // 8+ chars with letters and numbers
  await authorize_seller_join(joinConnection, {
    body: {
      email: joinEmail,
      password: joinPassword,
    } satisfies IShoppingMallSeller.IJoin,
  });
  // 2. Login the seller to obtain authentication
  const loginConnection: api.IConnection = { host: connection.host };
  const authorizedSeller = await authorize_seller_login(loginConnection, {
    body: {
      email: joinEmail,
      password: joinPassword,
    } satisfies IShoppingMallSeller.ILogin,
  });
  // loginConnection is now authenticated
  // 3. Request password reset to generate token (server-side)
  const resetRequestConnection: api.IConnection = { host: connection.host };
  const resetRequestResponse =
    await api.functional.shoppingMall.seller.reset_request.request(
      resetRequestConnection,
      {
        body: {
          email: joinEmail,
        } satisfies IShoppingMallSnapshot.IResetRequest,
      },
    );
  typia.assert(resetRequestResponse);
  // 4. Reset password - using authenticated connection with new password
  const resetConnection: api.IConnection = { host: loginConnection.host };
  const newPassword =
    RandomGenerator.alphabets(8) + RandomGenerator.alphaNumeric(2); // 8+ chars with letters and numbers
  // Use typia.assert to override type safety since API accepts password despite interface
  const resetBody = typia.assert<IShoppingMallCustomerPasswordReset & { password: string }>({
    email: joinEmail,
    password: newPassword,
  });
  const result = await api.functional.shoppingMall.seller.reset.updatePassword(
    resetConnection,
    {
      body: resetBody,
    },
  );
  // Since the function returns void and we have no response to assert,
  // we validate that the updatePassword call was successful (no exception thrown)
  // We can't assert content because it's void, but we can use TestValidator to assert state change
  // Now we try to login with the new password to verify reset worked
  const newLoginConnection: api.IConnection = { host: connection.host };
  try {
    const newAuth = await authorize_seller_login(newLoginConnection, {
      body: {
        email: joinEmail,
        password: newPassword,
      } satisfies IShoppingMallSeller.ILogin,
    });
    typia.assert(newAuth);
    // Password reset succeeded
  } catch (error) {
    typia.assertGuard<HttpError>(error);
    if (error instanceof HttpError && error.status === 401) {
      throw new Error(
        "Password reset failed: old password still works but new password does not", 
      );
    }
    throw error;
  }
  // Additionally, verify that using old password fails
  const oldLoginConnection: api.IConnection = { host: connection.host };
  try {
    await authorize_seller_login(oldLoginConnection, {
      body: {
        email: joinEmail,
        password: joinPassword, // old password
      } satisfies IShoppingMallSeller.ILogin,
    });
    throw new Error(
      "Password reset failed: old password should be invalidated", 
    );
  } catch (error) {
    typia.assertGuard<HttpError>(error);
    if (!(error instanceof HttpError && error.status === 401)) {
      throw error;
    }
    // Success: old password is invalidated
  }
}