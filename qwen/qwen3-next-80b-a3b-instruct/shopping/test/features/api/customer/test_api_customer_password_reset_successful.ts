import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_password_reset_successful(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer and store credentials
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const originalPassword =
    RandomGenerator.alphabets(8) + RandomGenerator.alphaNumeric(1);
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_customer_join(joinConnection, {
    body: {
      email: customerEmail,
      password: originalPassword,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(joinResponse);
  // 2. Trigger password reset request
  const resetRequestConnection: api.IConnection = { host: connection.host };
  await api.functional.shoppingMall.customer.reset_request.request(
    resetRequestConnection,
    {
      body: {
        email: customerEmail,
      } satisfies IShoppingMallCustomerPasswordReset,
    },
  );
  // 3. Perform password reset using reset endpoint
  const resetConnection: api.IConnection = { host: connection.host };
  await api.functional.shoppingMall.customer.reset.updatePassword(
    resetConnection,
    {
      body: {
        email: customerEmail,
      } satisfies IShoppingMallCustomerPasswordReset,
    },
  );
  // 4. Verify that original password no longer works (password was reset)
  const loginConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("old password should not work", async () => {
    await authorize_customer_login(loginConnection, {
      body: {
        email: customerEmail,
        password: originalPassword,
      } satisfies IShoppingMallCustomer.ILogin,
    });
  });
  // Note: We cannot verify login with new password because we don't know it
  // The system generates a new password and sends it via email
  // The test validates that the old password was invalidated
}
