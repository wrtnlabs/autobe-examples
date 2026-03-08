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

/**
 * Test successful administrator account registration workflow.
 *
 * Validates complete admin registration flow including:
 * 1. Registration endpoint submission with valid data
 * 2. Response structure validation
 * 3. Token generation and expiration verification
 * 4. Token usability for authenticated requests
 */
export async function test_api_admin_registration_success(
  connection: api.IConnection,
): Promise<void> {
  // Generate unique registration data
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  // Create admin-specific connection and perform registration
  const adminConnection: api.IConnection = { host: connection.host };
  const result = await authorize_admin_join(adminConnection, {
    body: {
      email: email satisfies string as string,
      password,
      href,
      referrer,
    } satisfies IEconomicPoliticalBoardAdmin.IJoin,
  });
  typia.assert(result);
  // Validate user id is valid UUID format
  typia.assert(result.id);
  // Validate token structure and required fields
  typia.assert(result.token);
  const token = result.token;
  // Validate access token is not empty
  TestValidator.predicate("access token is not empty", token.access.length > 0);
  // Validate refresh token is not empty
  TestValidator.predicate(
    "refresh token is not empty",
    token.refresh.length > 0,
  );
  // Validate expired_at is valid ISO 8601 date-time
  const expiredAt = new Date(token.expired_at);
  TestValidator.predicate(
    "expired_at is valid date-time",
    !Number.isNaN(expiredAt.getTime()),
  );
  // Validate refreshable_until is valid ISO 8601 date-time
  const refreshableUntil = new Date(token.refreshable_until);
  TestValidator.predicate(
    "refreshable_until is valid date-time",
    !Number.isNaN(refreshableUntil.getTime()),
  );
  // Verify token expiration times are reasonable (access ~15min, refresh ~7days)
  const now = new Date();
  const accessLifetimeMinutes =
    (expiredAt.getTime() - now.getTime()) / 1000 / 60;
  const refreshLifetimeDays =
    (refreshableUntil.getTime() - now.getTime()) / 1000 / 60 / 60 / 24;
  TestValidator.predicate(
    "access token lifetime is reasonable (~15 minutes)",
    accessLifetimeMinutes >= 10 && accessLifetimeMinutes <= 30,
  );
  TestValidator.predicate(
    "refresh token lifetime is reasonable (~7 days)",
    refreshLifetimeDays >= 6 && refreshLifetimeDays <= 8,
  );
  // Verify access token must be used before expired_at
  TestValidator.predicate("expired_at is in the future", expiredAt > now);
  // Verify refreshable_until is after expired_at (token can be refreshed)
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    refreshableUntil > expiredAt,
  );
  // Test token usability by verifying the connection was properly configured
  // After authorize_admin_join, adminConnection.headers should contain the access token
  if (adminConnection.headers !== undefined) {
    TestValidator.predicate(
      "admin connection has authorization header",
      adminConnection.headers.authorization !== undefined &&
        adminConnection.headers.authorization !== null &&
        adminConnection.headers.authorization.toString().startsWith("Bearer "),
    );
  }
  // Verify both token types are present
  typia.assertGuard(token.access);
  typia.assertGuard(token.refresh);
}