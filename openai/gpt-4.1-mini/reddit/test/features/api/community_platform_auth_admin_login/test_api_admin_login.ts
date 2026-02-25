import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_login(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Admin login functionality test according to spec
  // Known admin credentials
  const knownPassword = "StrongPass123!";
  const knownEmail = `admin_${RandomGenerator.alphaNumeric(8)}@example.com`;
  // Create separate connection for admin join
  const joinConnection: api.IConnection = { host: connection.host };
  // Create admin account with known credentials
  const adminJoinOutput = await authorize_admin_join(joinConnection, {
    body: {
      email: knownEmail,
      password: knownPassword,
      displayName: RandomGenerator.name(1),
      bio: null,
      avatarUrl: null,
    },
  });
  typia.assert(adminJoinOutput);
  // --- Scenario 1: Successful login with valid credentials ---
  const loginConnection: api.IConnection = { host: connection.host };
  const loginOutput = await authorize_admin_login(loginConnection, {
    body: {
      email: knownEmail,
      password: knownPassword,
    },
  });
  typia.assert(loginOutput);
  // Validate that returned admin matches login input
  TestValidator.equals(
    "successful login email matches",
    loginOutput.email,
    knownEmail,
  );
  // Validate presence and primitive type of token fields
  TestValidator.predicate(
    "login success has access token",
    typeof loginOutput.token.access === "string" &&
      loginOutput.token.access.length > 0,
  );
  TestValidator.predicate(
    "login success has refresh token",
    typeof loginOutput.token.refresh === "string" &&
      loginOutput.token.refresh.length > 0,
  );
  // Validate ISO 8601 date-time format of token expiration fields
  const isoDateTimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d{1,3})?Z$/;
  TestValidator.predicate(
    "login success access token expiry is valid ISO string",
    isoDateTimeRegex.test(loginOutput.token.expired_at),
  );
  TestValidator.predicate(
    "login success refresh token expiry is valid ISO string",
    isoDateTimeRegex.test(loginOutput.token.refreshable_until),
  );
  // --- Scenario 2: Failed login with incorrect password ---
  await TestValidator.error("login fails with wrong password", async () => {
    await authorize_admin_login(loginConnection, {
      body: {
        email: knownEmail,
        password: "wrong_password",
      },
    });
  });
  // --- Scenario 3: Failed login with non-existent email ---
  await TestValidator.error("login fails with non-existent email", async () => {
    await authorize_admin_login(loginConnection, {
      body: {
        email: `nonexistent_${RandomGenerator.alphaNumeric(8)}@example.com`,
        password: "any_password",
      },
    });
  });
}
