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

export async function test_api_customer_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Create test customer account
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallCustomer.IJoin;
  const joinConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(joinConnection, {
    body: joinInput,
  });
  typia.assert(authorized);
  // Login with valid credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResponse = await authorize_customer_login(loginConnection, {
    body: {
      email: joinInput.email,
      password: joinInput.password,
    } satisfies IShoppingMallCustomer.ILogin,
  });
  typia.assert(loginResponse);
  // Validate login response structure
  TestValidator.equals("customer_id matches", loginResponse.id, authorized.id);
  TestValidator.equals("email matches", loginResponse.email, joinInput.email);
  TestValidator.predicate("access token exists", !!loginResponse.token.access);
  TestValidator.predicate(
    "refresh token exists",
    !!loginResponse.token.refresh,
  );
  TestValidator.predicate(
    "expired_at is date-time",
    /^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z$/.test(
      loginResponse.token.expired_at,
    ),
  );
  TestValidator.predicate(
    "refreshable_until is date-time",
    /^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z$/.test(
      loginResponse.token.refreshable_until,
    ),
  );
  // Verify we can use the token for subsequent requests (simple ping)
  const pingConnection: api.IConnection = { host: connection.host };
  pingConnection.headers = {
    Authorization: `Bearer ${loginResponse.token.access}`,
  };
  // We don't have a /ping endpoint, but the connection now has valid auth
  // and we've validated the token structure
}
