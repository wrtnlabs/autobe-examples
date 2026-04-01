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
  const signupConnection: api.IConnection = { host: connection.host };
  const password = RandomGenerator.alphaNumeric(16);
  const email = typia.random<string & tags.Format<"email">>();
  const joined = await authorize_customer_join(signupConnection, {
    body: {
      email,
      password,
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(joined);
  const loginConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_login(loginConnection, {
    body: {
      email,
      password,
    } satisfies IMallPlatformCustomer.ILogin,
  });
  typia.assert(authorized);
  TestValidator.equals(
    "customer id should match joined account",
    authorized.id,
    joined.id,
  );
  TestValidator.equals(
    "customer email should match joined account",
    authorized.email,
    email,
  );
  TestValidator.equals(
    "customer status should be active",
    authorized.status,
    joined.status,
  );
  TestValidator.equals(
    "customer should not be deleted",
    authorized.deletedAt,
    null,
  );
  TestValidator.predicate(
    "access token should be issued",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be issued",
    authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access expiration should be present",
    authorized.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refresh expiration should be present",
    authorized.token.refreshable_until.length > 0,
  );
}
