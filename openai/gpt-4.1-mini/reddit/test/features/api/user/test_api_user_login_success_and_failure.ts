import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

/**
 * Test user login success scenario only, since login request body is empty type.
 *
 * Scenario:
 * - Register user
 * - Login with empty credentials (body)
 * - Validate tokens and authorization response
 */
export async function test_api_user_login_success_and_failure(
  connection: api.IConnection,
): Promise<void> {
  // Successful login scenario
  const userConnection: api.IConnection = { host: connection.host };
  // Register a new user (join)
  const joinOutput = await authorize_user_join(userConnection, { body: {} });
  typia.assert(joinOutput);
  // Login with empty body (successful login)
  const loginOutput = await authorize_user_login(userConnection, { body: {} });
  typia.assert(loginOutput);
  // Validate authorization token
  const { token } = loginOutput;
  TestValidator.predicate(
    "access token is non-empty string",
    typeof token.access === "string" && token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty string",
    typeof token.refresh === "string" && token.refresh.length > 0,
  );
  // Validate token expiration timestamps
  const expiredAt = new Date(token.expired_at);
  TestValidator.predicate(
    "expired_at is valid date",
    !isNaN(expiredAt.getTime()),
  );
  const refreshableUntil = new Date(token.refreshable_until);
  TestValidator.predicate(
    "refreshable_until is valid date",
    !isNaN(refreshableUntil.getTime()),
  );
}
