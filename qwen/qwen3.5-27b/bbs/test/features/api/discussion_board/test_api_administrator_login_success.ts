import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test successful administrator login with valid credentials.
 * 1. Register a new administrator account with valid credentials
 * 2. Login using the registered credentials
 * 3. Validate response contains administrator profile and authorization tokens
 * 4. Verify token expiration times are correct
 */
export async function test_api_administrator_login_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator connection for registration
  const adminConnection: api.IConnection = { host: connection.host };
  // Generate registration credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.Format<"password">>();
  const displayName = RandomGenerator.name();
  const bio = RandomGenerator.paragraph({ sentences: 2 });
  // 2. Register new administrator account
  const registered = await authorize_administrator_join(adminConnection, {
    body: {
      email,
      password,
      display_name: displayName,
      bio,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdministrator.IJoin,
  });
  typia.assert(registered);
  // 3. Create new connection for login (using same host)
  const loginConnection: api.IConnection = { host: connection.host };
  // 4. Login with registered credentials
  const loggedIn = await authorize_administrator_login(loginConnection, {
    body: {
      email,
      password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdministrator.ILogin,
  });
  typia.assert(loggedIn);
  // 5. Validate administrator profile information matches input
  TestValidator.equals("email matches input", loggedIn.email, email);
  TestValidator.equals(
    "display_name matches input",
    loggedIn.display_name,
    displayName,
  );
  TestValidator.equals("bio matches input", loggedIn.bio, bio);
  TestValidator.equals("grade is regular", loggedIn.grade, "regular");
  TestValidator.equals("deleted_at is null", loggedIn.deleted_at, null);
  // 6. Validate authorization tokens structure
  TestValidator.predicate(
    "access token is not empty",
    loggedIn.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is not empty",
    loggedIn.token.refresh.length > 0,
  );
  // 7. Verify token expiration times
  const expiredAt = new Date(loggedIn.token.expired_at);
  const refreshableUntil = new Date(loggedIn.token.refreshable_until);
  const now = new Date();
  TestValidator.predicate("access token expires in future", expiredAt > now);
  TestValidator.predicate(
    "refresh token expires in future",
    refreshableUntil > now,
  );
  TestValidator.predicate(
    "refresh token expires after access token",
    refreshableUntil > expiredAt,
  );
  // 8. Verify access token is short-lived (approximately 15 minutes)
  const accessExpiryMinutes =
    (expiredAt.getTime() - now.getTime()) / (1000 * 60);
  TestValidator.predicate(
    "access token expires within 30 minutes",
    accessExpiryMinutes <= 30,
  );
  TestValidator.predicate(
    "access token expires after 5 minutes",
    accessExpiryMinutes >= 5,
  );
  // 9. Verify refresh token is long-lived (approximately 7 days)
  const refreshExpiryDays =
    (refreshableUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  TestValidator.predicate(
    "refresh token expires within 14 days",
    refreshExpiryDays <= 14,
  );
  TestValidator.predicate(
    "refresh token expires after 3 days",
    refreshExpiryDays >= 3,
  );
  // 10. Verify connection headers were updated with access token
  TestValidator.predicate(
    "connection has Authorization header",
    loginConnection.headers?.Authorization !== undefined,
  );
  TestValidator.equals(
    "Authorization header matches access token",
    loginConnection.headers?.Authorization,
    loggedIn.token.access,
  );
}
