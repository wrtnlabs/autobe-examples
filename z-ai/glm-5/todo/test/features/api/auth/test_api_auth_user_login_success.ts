import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

/**
 * Test successful user login with valid credentials.
 * 1. Create a new user account via join endpoint
 * 2. Login with the same credentials
 * 3. Verify response contains valid tokens and user information
 */
export async function test_api_auth_user_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Prepare test credentials
  const email = typia.random<string & tags.MaxLength<254> & tags.Format<"email">>();
  const password = `A1a!${RandomGenerator.alphaNumeric(8)}`;
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  // Step 1: Create a new user account
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_user_join(joinConnection, {
    body: {
      email,
      password,
      password_confirm: password,
      href,
      referrer,
    },
  });
  typia.assert(joinResponse);
  // Step 2: Login with the same credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResponse = await authorize_user_login(loginConnection, {
    body: {
      email,
      password,
      href,
      referrer,
    } satisfies ITodoAppUser.ILogin,
  });
  typia.assert(loginResponse);
  // Step 3: Validate response
  TestValidator.equals("user id matches", loginResponse.id, joinResponse.id);
  TestValidator.equals(
    "display name matches",
    loginResponse.display_name,
    joinResponse.display_name,
  );
  TestValidator.predicate(
    "access token exists",
    loginResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    loginResponse.token.refresh.length > 0,
  );
  // Validate token expiration times
  const now = new Date();
  const expiredAt = new Date(loginResponse.token.expired_at);
  const refreshableUntil = new Date(loginResponse.token.refreshable_until);
  // Access token should expire in approximately 15 minutes (900000 ms)
  const fifteenMinutesMs = 15 * 60 * 1000;
  const expiredAtDiff = Math.abs(
    expiredAt.getTime() - now.getTime() - fifteenMinutesMs,
  );
  TestValidator.predicate(
    "expired_at approximately 15 minutes",
    expiredAtDiff < 60000,
  );
  // Refresh token should expire in approximately 30 days
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const refreshableUntilDiff = Math.abs(
    refreshableUntil.getTime() - now.getTime() - thirtyDaysMs,
  );
  TestValidator.predicate(
    "refreshable_until approximately 30 days",
    refreshableUntilDiff < 60000,
  );
}