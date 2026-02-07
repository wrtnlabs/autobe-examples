import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_join_success(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for the test
  const customerConnection: api.IConnection = { host: connection.host };
  // Generate random customer data
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12) + "123!",
    name: RandomGenerator.name(),
  } satisfies IShoppingMallCustomer.IJoin;
  // Register new customer
  const result = await authorize_customer_join(customerConnection, {
    body: joinInput,
  });
  // Validate response
  typia.assert(result);
  typia.assert(result.token);
  // Verify token fields exist and have correct format
  TestValidator.equals(
    "access token exists",
    typeof result.token.access,
    "string",
  );
  TestValidator.equals(
    "refresh token exists",
    typeof result.token.refresh,
    "string",
  );
  TestValidator.predicate(
    "expired_at is valid date-time",
    Date.parse(result.token.expired_at) > 0,
  );
  TestValidator.predicate(
    "refreshable_until is valid date-time",
    Date.parse(result.token.refreshable_until) > 0,
  );
  // Verify access token is not empty
  TestValidator.notEquals("access token is not empty", result.token.access, "");
  TestValidator.notEquals(
    "refresh token is not empty",
    result.token.refresh,
    "",
  );
  // Verify tokens are different
  TestValidator.notEquals(
    "access and refresh tokens are different",
    result.token.access,
    result.token.refresh,
  );
  // Verify connection headers were updated with authorization token
  TestValidator.notEquals(
    "Authorization header is set",
    customerConnection.headers?.Authorization,
    undefined,
  );
  TestValidator.equals(
    "Authorization header contains access token",
    customerConnection.headers?.Authorization,
    result.token.access,
  );
}
