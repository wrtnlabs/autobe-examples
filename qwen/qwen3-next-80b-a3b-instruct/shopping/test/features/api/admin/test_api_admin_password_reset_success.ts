import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_password_reset_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create new admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const joinEmail = typia.random<string & tags.Format<"email">>();
  const joinPassword =
    RandomGenerator.alphabets(5) +
    RandomGenerator.alphabets(5).toUpperCase() +
    "1!"; // 12+ chars: 5lower + 5upper + 2special/numeric
  const joinResult = await authorize_admin_join(adminConnection, {
    body: {
      email: joinEmail,
      password: joinPassword,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(joinResult);
  // 2. Trigger password reset token generation
  const resetRequestConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(resetRequestConnection, {
    body: {
      email: joinEmail,
      password: joinPassword,
    } satisfies IShoppingMallAdmin.ILogin,
  });
  const resetRequestResult =
    await api.functional.shoppingMall.admin.reset_request.request(
      resetRequestConnection,
      {
        body: { email: joinEmail } satisfies IShoppingMallCustomerPasswordReset,
      },
    );
  typia.assert(resetRequestResult);
  // 3. Reset password with new password
  const resetConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(resetConnection, {
    body: {
      email: joinEmail,
      password: joinPassword,
    } satisfies IShoppingMallAdmin.ILogin,
  });
  const newPassword =
    RandomGenerator.alphabets(4) +
    RandomGenerator.alphabets(4).toUpperCase() +
    "2@" +
    RandomGenerator.alphaNumeric(2); // 12+ chars
  await api.functional.shoppingMall.admin.reset.updatePassword(
    resetConnection,
    {
      body: {
        email: joinEmail,
        password: newPassword,
      } as any satisfies IShoppingMallCustomerPasswordReset,
    },
  );
  // Validation: Attempt to login with new password to verify reset was successful
  const verifyConnection: api.IConnection = { host: connection.host };
  const newLoginResult = await authorize_admin_login(verifyConnection, {
    body: {
      email: joinEmail,
      password: newPassword,
    } satisfies IShoppingMallAdmin.ILogin,
  });
  typia.assert(newLoginResult);
  // Confirm old password no longer works
  const oldPasswordConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "Old password should be invalid after reset",
    async () => {
      await authorize_admin_login(oldPasswordConnection, {
        body: {
          email: joinEmail,
          password: joinPassword,
        } satisfies IShoppingMallAdmin.ILogin,
      });
    },
  );
}
