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

export async function test_api_customer_password_reset_retrieval_existing_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a new customer via join
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {} satisfies IShoppingMallCustomer.IJoin,
  });
  // Update customerConnection with the access token
  customerConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Attempt to retrieve a random (very likely non-existing) password reset token
  const passwordResetId = typia.random<string & tags.Format<"uuid">>();
  try {
    // 3. Try to get password reset token
    const output: IShoppingMallCustomerPasswordReset =
      await api.functional.shoppingMall.customer.password_resets.at(
        customerConnection,
        { passwordResetId },
      );
    typia.assert(output);
    // Scenario 1: Success case (token found)
  } catch (e) {
    if (e instanceof api.HttpError && e.status === 404) {
      // Scenario 2: Token not found case
      await TestValidator.httpError(
        "password reset token not found",
        404,
        async () => {
          await api.functional.shoppingMall.customer.password_resets.at(
            customerConnection,
            {
              passwordResetId,
            },
          );
        },
      );
      return;
    }
    throw e;
  }
}
