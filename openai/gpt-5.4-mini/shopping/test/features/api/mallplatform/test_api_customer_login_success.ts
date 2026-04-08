import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
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
  const joinConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.Format<"password">>();
  const joined = await authorize_customer_join(joinConnection, {
    body: {
      email,
      password,
      href: `https://example.com/register/${RandomGenerator.alphabets(8)}`,
      referrer: `https://example.com/${RandomGenerator.alphabets(8)}`,
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(joined);
  const loginConnection: api.IConnection = { host: connection.host };
  const loggedIn = await authorize_customer_login(loginConnection, {
    body: {
      email,
      password,
    } satisfies IMallPlatformCustomer.ILogin,
  });
  typia.assert(loggedIn);
  TestValidator.equals(
    "customer id should match joined account",
    loggedIn.id,
    joined.id,
  );
  TestValidator.equals(
    "customer email should match joined account",
    loggedIn.email,
    email,
  );
  TestValidator.equals(
    "customer status should match joined account",
    loggedIn.status,
    joined.status,
  );
  TestValidator.predicate(
    "access token should exist",
    loggedIn.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should exist",
    loggedIn.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token expiration should exist",
    loggedIn.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshable until should exist",
    loggedIn.token.refreshable_until.length > 0,
  );
}
