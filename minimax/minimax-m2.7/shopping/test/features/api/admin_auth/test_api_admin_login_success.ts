import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Generate valid credentials for admin registration and login
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16) as string &
    tags.Format<"password">;
  const name = RandomGenerator.name();
  // 1. Create a new administrator account using admin join endpoint
  const joinConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(joinConnection, {
    body: {
      email: email,
      password: password,
      name: name,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Login with the created admin credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResponse = await authorize_admin_login(loginConnection, {
    body: {
      email: email,
      password: password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 3. Validate response with typia.assert()
  typia.assert(loginResponse);
  // 4. Validate JWT tokens exist
  TestValidator.predicate("has access token", loginResponse.access.length > 0);
  TestValidator.predicate(
    "has refresh token",
    loginResponse.refresh.length > 0,
  );
  TestValidator.predicate(
    "has expired_at",
    loginResponse.expired_at.length > 0,
  );
  // 5. Validate admin account details
  TestValidator.equals("email matches input", loginResponse.email, email);
  TestValidator.equals("name matches input", loginResponse.name, name);
  TestValidator.predicate("has admin id", loginResponse.id.length > 0);
  TestValidator.predicate(
    "has created_at",
    loginResponse.created_at.length > 0,
  );
  TestValidator.predicate(
    "has updated_at",
    loginResponse.updated_at.length > 0,
  );
  TestValidator.equals("deleted_at is null", loginResponse.deleted_at, null);
  // 6. Validate token structure in response
  TestValidator.predicate(
    "has valid token.access",
    loginResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "has valid token.refresh",
    loginResponse.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "has valid token.expired_at",
    loginResponse.token.expired_at.length > 0,
  );
  // 7. Verify access token can be used for authenticated requests
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${loginResponse.token.access}`,
    },
  };
  TestValidator.predicate(
    "authenticated connection has Authorization header",
    authenticatedConnection.headers?.Authorization !== undefined,
  );
}
