import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_login_with_valid_credentials(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a customer account to establish valid credentials
  const joinConnection: api.IConnection = { host: connection.host };
  const credentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IEcommerceMallCustomer.IJoin;
  const registered = await authorize_customer_join(joinConnection, {
    body: credentials,
  });
  typia.assert(registered);
  // Step 2: Login with the valid credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_login(loginConnection, {
    body: {
      email: credentials.email,
      password: credentials.password,
    } satisfies IEcommerceMallCustomer.ILogin,
  });
  typia.assert(authorized);
  // Step 3: Validate response contains expected authentication data
  TestValidator.equals(
    "email matches input credentials",
    authorized.email,
    credentials.email,
  );
  TestValidator.equals(
    "customer id matches registered account",
    authorized.id,
    registered.id,
  );
  TestValidator.predicate(
    "access token is present and valid",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is present and valid",
    authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token expiration is in the future",
    new Date(authorized.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "refreshable until is in the future",
    new Date(authorized.token.refreshable_until) > new Date(),
  );
  TestValidator.equals(
    "profile customerId matches authorized id",
    authorized.profile.customerId,
    authorized.id,
  );
}
