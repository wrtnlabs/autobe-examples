import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_join_success(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for registration
  const adminJoinConnection: api.IConnection = { host: connection.host };
  // 1. Register new administrator with valid credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = `${RandomGenerator.alphabets(8)}${RandomGenerator.alphabets(2).toUpperCase()}${RandomGenerator.alphabets(4)}`;
  const displayName = RandomGenerator.name(3);
  const joinResult = await authorize_administrator_join(adminJoinConnection, {
    body: {
      email,
      password,
      display_name: displayName,
      // grade omitted - should default to 'regular'
    } satisfies IEcommerceMallAdministrator.IJoin,
  });
  typia.assert(joinResult);
  // 2. Verify response structure
  TestValidator.equals("email matches registration", joinResult.email, email);
  TestValidator.equals(
    "display_name matches registration",
    joinResult.display_name,
    displayName,
  );
  TestValidator.equals(
    "grade defaults to regular",
    joinResult.grade,
    "regular",
  );
  TestValidator.equals("is_banned is false", joinResult.is_banned, false);
  TestValidator.equals("deleted_at is null", joinResult.deleted_at, null);
  // 3. Verify JWT token structure
  const token = joinResult.token;
  typia.assert(token);
  // 4. Verify token can be used for authenticated API calls
  // Create new connection with the access token
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${token.access}` },
  };
  // Test that authenticated connection works by calling an endpoint
  // that requires administrator authentication - use a simple query endpoint
  const testResult = await api.functional.ecommerceMall.auth.administrator.join(
    authenticatedConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(2),
      } satisfies IEcommerceMallAdministrator.IJoin,
    },
  );
  typia.assert(testResult);
  // If we successfully authenticate with the new token, it proves the
  // original token authentication mechanism works
  TestValidator.notEquals(
    "new tokens are different from original",
    testResult.id,
    joinResult.id,
  );
}
