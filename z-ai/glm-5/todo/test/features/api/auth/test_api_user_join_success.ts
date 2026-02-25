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
 * Test successful user registration with valid credentials.
 *
 * Steps:
 * 1. Prepare registration request with valid email, strong password (meeting complexity requirements),
 *    matching password_confirm, and session context fields (href, referrer, optional ip).
 * 2. Send POST request to /todoApp/auth/user/join.
 * 3. Verify response contains: id (UUID format), display_name (defaults to email),
 *    and token object with access and refresh JWT tokens.
 * 4. Verify access token expires in approximately 15 minutes.
 * 5. Verify refresh token is valid for approximately 30 days.
 * 6. Verify display_name defaults to email address upon registration.
 */
export async function test_api_user_join_success(
  connection: api.IConnection,
): Promise<void> {
  // Prepare valid registration data
  const email = typia.random<string & tags.Format<"email">>() satisfies string as string;
  const password = "Password123!@#"; // Meets all complexity requirements
  const href = typia.random<string & tags.Format<"uri">>() satisfies string as string;
  const referrer = typia.random<string & tags.Format<"uri">>() satisfies string as string;
  const body = {
    email,
    password,
    password_confirm: password,
    href,
    referrer,
  } satisfies ITodoAppUser.IJoin;
  // Create a new connection for this test
  const userConnection: api.IConnection = { host: connection.host };
  // Send join request
  const response = await api.functional.todoApp.auth.user.join(userConnection, {
    body,
  });
  // Validate response structure
  typia.assert(response);
  // Verify id is a UUID
  TestValidator.predicate("id is UUID format", () =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      response.id,
    ),
  );
  // Verify display_name defaults to email
  TestValidator.equals(
    "display_name defaults to email",
    response.display_name,
    email,
  );
  // Verify token exists with access and refresh
  TestValidator.predicate(
    "access token exists",
    () => response.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    () => response.token.refresh.length > 0,
  );
  // Verify expired_at is approximately 15 minutes from now (allow 1 minute tolerance)
  const now = new Date();
  const expiredAt = new Date(response.token.expired_at);
  const expectedExpiredAt = new Date(now.getTime() + 15 * 60 * 1000);
  const toleranceMs = 60 * 1000; // 1 minute tolerance
  TestValidator.predicate(
    "access token expires in ~15 minutes",
    () =>
      Math.abs(expiredAt.getTime() - expectedExpiredAt.getTime()) < toleranceMs,
  );
  // Verify refreshable_until is approximately 30 days from now (allow 1 hour tolerance)
  const refreshableUntil = new Date(response.token.refreshable_until);
  const expectedRefreshableUntil = new Date(
    now.getTime() + 30 * 24 * 60 * 60 * 1000,
  );
  const toleranceHoursMs = 60 * 60 * 1000; // 1 hour tolerance
  TestValidator.predicate(
    "refresh token valid for ~30 days",
    () =>
      Math.abs(
        refreshableUntil.getTime() - expectedRefreshableUntil.getTime(),
      ) < toleranceHoursMs,
  );
  // Verify the connection is now authenticated (Authorization header set)
  TestValidator.predicate(
    "connection has Authorization header",
    () => userConnection.headers?.Authorization !== undefined,
  );
}
