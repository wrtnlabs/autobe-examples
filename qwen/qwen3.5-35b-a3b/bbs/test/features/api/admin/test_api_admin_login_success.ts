import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdmin";
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
  // Step 1: Register admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const joinEmail = typia.random<string & tags.Format<"email">>();
  const joinPassword = RandomGenerator.alphaNumeric(16);
  const joinResponse = await authorize_admin_join(adminConnection, {
    body: {
      email: joinEmail satisfies string as string,
      password: joinPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(joinResponse);
  // Step 2: Login with registered credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResponse = await authorize_admin_login(loginConnection, {
    body: { email: joinEmail, password: joinPassword },
  });
  typia.assert(loginResponse);
  // Step 3: Validate response structure
  const { id, token } = loginResponse;
  typia.assert(id);
  typia.assert(token);
  // Validate id is UUID format
  typia.assert<string & tags.Format<"uuid">>(id);
  // Validate access token expiration (should be within ~15 minutes)
  const expiredAt = new Date(token.expired_at);
  const refreshableUntil = new Date(token.refreshable_until);
  const now = new Date();
  const accessExpirationSeconds = (expiredAt.getTime() - now.getTime()) / 1000;
  TestValidator.predicate(
    "access token expiration within 15 minutes",
    accessExpirationSeconds > 0 && accessExpirationSeconds <= 900,
  );
  // Validate refresh token expiration (should be within ~7 days)
  const refreshExpirationSeconds =
    (refreshableUntil.getTime() - now.getTime()) / 1000;
  TestValidator.predicate(
    "refresh token expiration within 7 days",
    refreshExpirationSeconds > 0 && refreshExpirationSeconds <= 604800,
  );
  // Step 4: Verify session maintained with access token
  TestValidator.equals(
    "Authorization header set after login",
    loginConnection.headers?.Authorization !== undefined,
    true,
  );
  // Step 5: Verify session works by using it in subsequent request
  // The loginConnection should have the access token in Authorization header
  if (loginConnection.headers?.Authorization) {
    const authHeader = loginConnection.headers.Authorization;
    if (typeof authHeader === "string") {
      TestValidator.predicate(
        "Authorization header contains Bearer token",
        authHeader.startsWith("Bearer "),
      );
    }
  }
}