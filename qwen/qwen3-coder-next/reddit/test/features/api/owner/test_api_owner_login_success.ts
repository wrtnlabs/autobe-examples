import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";

export async function test_api_owner_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create owner connection and register a new owner account
  const ownerConnection: api.IConnection = { host: connection.host };
  const registerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!" as string & tags.MinLength<8>,
    username: `owner_${RandomGenerator.alphaNumeric(8)}`,
    displayName: "Test Owner User",
  } satisfies IRedditCloneOwner.IJoin;
  const registeredOwner = await authorize_owner_join(ownerConnection, {
    body: registerData,
  });
  typia.assert(registeredOwner);
  // Step 2: Login with the newly created owner account
  const loginData = {
    email: registerData.email,
    password: "SecurePass123!" as string & tags.Format<"password">,
    href: "http://localhost:3000",
    referrer: "http://localhost:3000",
  } satisfies IRedditCloneOwner.ILogin;
  const ownerConnection2: api.IConnection = { host: connection.host };
  const loggedOwner = await authorize_owner_login(ownerConnection2, {
    body: loginData,
  });
  typia.assert(loggedOwner);
  // Step 3: Validate login response structure
  TestValidator.equals("owner ID matches", loggedOwner.id, registeredOwner.id);
  TestValidator.predicate(
    "has access token",
    typeof loggedOwner.token.access === "string" &&
      loggedOwner.token.access.length > 0,
  );
  TestValidator.predicate(
    "has refresh token",
    typeof loggedOwner.token.refresh === "string" &&
      loggedOwner.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "has valid expiration",
    new Date(loggedOwner.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "has valid refreshable_until",
    new Date(loggedOwner.token.refreshable_until) > new Date(),
  );
  TestValidator.predicate(
    "access token is JWT",
    loggedOwner.token.access.split(".").length === 3,
  );
  TestValidator.predicate(
    "refresh token is JWT",
    loggedOwner.token.refresh.split(".").length === 3,
  );
}
