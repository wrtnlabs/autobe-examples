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

export async function test_api_administrator_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create administrator account via join
  const joinConnection: api.IConnection = { host: connection.host };
  const joinPassword = RandomGenerator.alphaNumeric(16);
  const joinResult = await authorize_administrator_join(joinConnection, {
    body: {
      display_name: RandomGenerator.name(2),
      email: typia.random<string & tags.Format<"email">>(),
      password: joinPassword,
      grade: "regular" as const,
    } satisfies IEcommerceMallAdministrator.IJoin,
  });
  typia.assert(joinResult);
  // Step 2: Login with the same credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_administrator_login(loginConnection, {
    body: {
      email: joinResult.email,
      password: joinPassword,
      ip: "127.0.0.1",
      referrer: "http://localhost:3000/admin",
    } satisfies IEcommerceMallAdministrator.ILogin,
  });
  typia.assert(loginResult);
  // Step 3: Validate response contains correct administrator information
  TestValidator.equals(
    "administrator email matches",
    loginResult.email,
    joinResult.email,
  );
  TestValidator.equals(
    "administrator display name matches",
    loginResult.display_name,
    joinResult.display_name,
  );
  TestValidator.equals(
    "administrator grade is regular",
    loginResult.grade,
    "regular",
  );
  TestValidator.equals(
    "administrator is not banned",
    loginResult.is_banned,
    false,
  );
  TestValidator.equals(
    "administrator ID is consistent",
    loginResult.id,
    joinResult.id,
  );
  // Step 4: Validate token structure
  TestValidator.predicate(
    "access token is not empty",
    loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is not empty",
    loginResult.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is not empty",
    loginResult.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshable_until is not empty",
    loginResult.token.refreshable_until.length > 0,
  );
  // Step 5: Validate token expiration times are in the future
  const now = new Date();
  const expiredAt = new Date(loginResult.token.expired_at);
  const refreshableUntil = new Date(loginResult.token.refreshable_until);
  TestValidator.predicate("expired_at is in the future", expiredAt > now);
  TestValidator.predicate(
    "refreshable_until is in the future",
    refreshableUntil > now,
  );
  TestValidator.predicate(
    "expired_at is before refreshable_until",
    expiredAt < refreshableUntil,
  );
}
