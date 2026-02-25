import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_refresh_token_expired(
  connection: api.IConnection,
): Promise<void> {
  // Create initial customer connection and registration
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.paragraph({
        sentences: 1,
        wordMin: 2,
        wordMax: 4,
      }).substring(0, 50),
      phone_number: RandomGenerator.mobile(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer);
  // Create a separate connection for the expired token test to avoid header contamination
  const testConnection: api.IConnection = { host: connection.host };
  // Create an expired refresh token body using an invalid or malformed token
  // Since we can't actually manipulate token expiration without backend changes,
  // we use an invalid token that will be rejected as expired/unauthorized
  const expiredRefreshTokenBody: IEcommerceCustomer.IRefresh = {
    refresh_token: RandomGenerator.alphaNumeric(32), // Random invalid token
  };
  // Test that expired/invalid token refresh fails with authentication error
  await TestValidator.httpError(
    "refresh with expired token",
    [401, 403],
    async () => {
      await api.functional.ecommerce.auth.customer.refresh(testConnection, {
        body: expiredRefreshTokenBody,
      });
    },
  );
}
