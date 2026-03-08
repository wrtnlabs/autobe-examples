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
  // Step 1: Create a new customer account with known credentials
  const joinConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const displayName = RandomGenerator.name();
  const phoneNumber = RandomGenerator.mobile();
  const joinResult = await authorize_customer_join(joinConnection, {
    body: {
      email,
      password,
      displayName,
      phoneNumber,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(joinResult);
  // Step 2: Login with the same credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_customer_login(loginConnection, {
    body: {
      email,
      password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallCustomer.ILogin,
  });
  typia.assert(loginResult);
  // Step 3: Validate response structure matches IAuthorized
  TestValidator.equals("email matches", loginResult.email, email);
  TestValidator.equals(
    "displayName matches",
    loginResult.displayName,
    displayName,
  );
  TestValidator.equals(
    "phoneNumber matches",
    loginResult.phoneNumber,
    phoneNumber,
  );
  TestValidator.equals("banned is false", loginResult.banned, false);
  // Step 4: Validate token structure
  TestValidator.predicate(
    "has access token",
    loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "has refresh token",
    loginResult.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "has expired_at",
    new Date(loginResult.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "has refreshable_until",
    new Date(loginResult.token.refreshable_until) > new Date(),
  );
}
