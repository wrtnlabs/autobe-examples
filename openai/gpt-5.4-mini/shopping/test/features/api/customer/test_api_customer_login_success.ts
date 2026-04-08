import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
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
      href: "https://example.com/signup",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
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
    "customer id should match registered account",
    loggedIn.id,
    joined.id,
  );
  TestValidator.equals(
    "customer email should match registered account",
    loggedIn.email,
    joined.email,
  );
  TestValidator.equals(
    "customer status should remain active",
    loggedIn.status,
    joined.status,
  );
  TestValidator.equals(
    "customer created_at should remain unchanged",
    loggedIn.created_at,
    joined.created_at,
  );
  TestValidator.equals(
    "customer deleted_at should remain null",
    loggedIn.deleted_at,
    joined.deleted_at,
  );
  TestValidator.predicate(
    "access token should be present",
    loggedIn.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be present",
    loggedIn.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token expiry should be present",
    loggedIn.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refresh token expiry should be present",
    loggedIn.token.refreshable_until.length > 0,
  );
  TestValidator.notEquals(
    "login should issue a fresh access token",
    loggedIn.token.access,
    joined.token.access,
  );
}
