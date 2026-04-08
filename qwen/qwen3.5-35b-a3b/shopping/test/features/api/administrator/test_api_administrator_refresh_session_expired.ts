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

export async function test_api_administrator_refresh_session_expired(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator joins with credentials
  const joinPassword = RandomGenerator.alphaNumeric(16);
  const joinEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminJoinResult = await authorize_administrator_join(
    adminJoinConnection,
    {
      body: {
        display_name: RandomGenerator.name(3),
        email: joinEmail,
        password: joinPassword,
      },
    },
  );
  typia.assert(adminJoinResult);
  // 2. Administrator logs in to establish valid session
  const adminLoginConnection: api.IConnection = { host: connection.host };
  const adminLoginResult = await authorize_administrator_login(
    adminLoginConnection,
    {
      body: {
        email: joinEmail,
        password: joinPassword,
        ip: "127.0.0.1",
        referrer: "http://localhost/admin",
      },
    },
  );
  typia.assert(adminLoginResult);
  // Store the refresh token from the valid session
  const validRefreshToken = adminLoginResult.token.refresh;
  const adminId = adminLoginResult.id;
  // 3. Verify the administrator account is not banned
  TestValidator.predicate(
    "admin account active",
    adminLoginResult.is_banned === false,
  );
  // 4. Test: Try to refresh with a token from a different non-existent admin
  // This simulates using an expired/deleted session token
  const invalidRefreshToken = typia.random<string & tags.Format<"uuid">>();
  const invalidRefreshConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("invalid token should fail refresh", async () => {
    await authorize_administrator_refresh(invalidRefreshConnection, {
      body: {
        refresh_token: invalidRefreshToken,
      },
    });
  });
  // 5. Verify the administrator account remains active after failed refresh attempt
  const adminStatusConnection: api.IConnection = { host: connection.host };
  const adminStatusResult = await authorize_administrator_login(
    adminStatusConnection,
    {
      body: {
        email: joinEmail,
        password: joinPassword,
        ip: "127.0.0.1",
        referrer: "http://localhost/admin",
      },
    },
  );
  typia.assert(adminStatusResult);
  TestValidator.predicate(
    "admin still active after failed refresh",
    adminStatusResult.is_banned === false,
  );
  // 6. Verify that valid refresh still works with the original valid token
  const validRefreshConnection: api.IConnection = { host: connection.host };
  const validRefreshResult = await authorize_administrator_refresh(
    validRefreshConnection,
    {
      body: {
        refresh_token: validRefreshToken,
      },
    },
  );
  typia.assert(validRefreshResult);
  TestValidator.predicate(
    "valid refresh succeeds",
    validRefreshResult.id === adminId,
  );
  // 7. Verify the admin can create a completely fresh session by logging in again
  const freshLoginConnection: api.IConnection = { host: connection.host };
  const freshLoginResult = await authorize_administrator_login(
    freshLoginConnection,
    {
      body: {
        email: joinEmail,
        password: joinPassword,
        ip: "127.0.0.1",
        referrer: "http://localhost/admin",
      },
    },
  );
  typia.assert(freshLoginResult);
  TestValidator.notEquals(
    "fresh session has new ID",
    adminId,
    freshLoginResult.id,
  );
}