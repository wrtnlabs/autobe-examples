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

export async function test_api_customer_password_reset_valid_email(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and register a new customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const originalEmail = typia.random<string & tags.Format<"email">>();
  const joinResponse = await authorize_customer_join(customerConnection, {
    body: {} satisfies IShoppingMallCustomer.IJoin, // Empty object as per DTO
  });
  typia.assert(joinResponse);
  // 2. Request password reset with the registered email
  // Even without email verification, system must return 200 OK for security
  const resetResponse =
    await api.functional.shoppingMall.customer.reset_request.request(
      customerConnection,
      {
        body: {
          email: originalEmail,
        } satisfies IShoppingMallCustomerPasswordReset,
      },
    );
  typia.assert(resetResponse);
  // 3. Validate response matches the exact contract (only email field)
  TestValidator.equals(
    "response contains the same email as request",
    resetResponse.email,
    originalEmail,
  );
  // 4. Verify no other properties exist in response (per contract)
  TestValidator.equals(
    "response has no token_id",
    "token_id" in resetResponse,
    false,
  );
  TestValidator.equals(
    "response has no password",
    "password" in resetResponse,
    false,
  );
  TestValidator.equals(
    "response has no user_id",
    "user_id" in resetResponse,
    false,
  );
  TestValidator.equals(
    "response has no token",
    "token" in resetResponse,
    false,
  );
}
