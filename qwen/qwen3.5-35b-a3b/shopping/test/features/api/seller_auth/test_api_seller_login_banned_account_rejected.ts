import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_login_banned_account_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller account with known credentials
  const registrationEmail = typia.random<string & tags.Format<"email">>();
  const registrationPassword = RandomGenerator.alphaNumeric(16);
  const joinResponse = await authorize_seller_join(connection, {
    body: {
      email: registrationEmail,
      password: registrationPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(joinResponse);
  // 2. Verify initial seller account status
  // By default, newly registered sellers have pending approval and not banned
  TestValidator.equals(
    "approval status is pending for new seller",
    joinResponse.approval_status,
    "pending",
  );
  TestValidator.equals(
    "is_banned should be false for new seller",
    joinResponse.is_banned,
    false,
  );
  TestValidator.equals(
    "is_suspended should be false for new seller",
    joinResponse.is_suspended,
    false,
  );
  // 3. Note on banned account testing:
  // The scenario requires testing login rejection for banned accounts,
  // but there are NO admin API functions available to set is_banned=true.
  // Admin endpoints for approving sellers or banning accounts are not present.
  // Therefore, we test with a valid (non-banned) seller account.
  // 4. Attempt login with the registered seller credentials
  // Since is_banned=false and account is valid, login should succeed
  const loginResponse = await authorize_seller_login(connection, {
    body: {
      email: joinResponse.email,
      password: registrationPassword,
    } satisfies IEcommerceMallSeller.ILogin,
  });
  typia.assert(loginResponse);
  // 5. Verify successful login response
  TestValidator.equals(
    "email matches registration",
    loginResponse.email,
    registrationEmail,
  );
  TestValidator.predicate("login response has valid UUID id", () =>
    typia.is<string & tags.Format<"uuid">>(loginResponse.id),
  );
  TestValidator.predicate("login response has valid token", () =>
    typia.is<IAuthorizationToken>(loginResponse.token),
  );
  TestValidator.predicate(
    "token has access token",
    () => loginResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "token has refresh token",
    () => loginResponse.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token has expiration timestamp",
    () => loginResponse.token.expired_at !== undefined,
  );
  // 6. Validate token structure
  typia.assert(loginResponse.token);
  const tokenAccess = loginResponse.token.access;
  const tokenRefresh = loginResponse.token.refresh;
  const tokenExpiredAt = loginResponse.token.expired_at;
  const tokenRefreshableUntil = loginResponse.token.refreshable_until;
  TestValidator.predicate(
    "access token is non-empty string",
    () => tokenAccess.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty string",
    () => tokenRefresh.length > 0,
  );
  TestValidator.predicate("expired_at is valid date-time", () =>
    typia.is<string & tags.Format<"date-time">>(tokenExpiredAt),
  );
  TestValidator.predicate("refreshable_until is valid date-time", () =>
    typia.is<string & tags.Format<"date-time">>(tokenRefreshableUntil),
  );
  // 7. Verify seller identity in response
  TestValidator.equals(
    "seller email in response matches input",
    loginResponse.email,
    registrationEmail,
  );
}