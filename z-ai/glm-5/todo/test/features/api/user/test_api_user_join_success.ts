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
 * Validates the complete happy path for user signup including:
 * - Valid email format
 * - Strong password meeting complexity requirements
 * - Proper response structure with UUID id, display_name, and JWT tokens
 * - Display name defaults to email upon registration
 * - Access token expires in ~15 minutes
 * - Refresh token valid for ~30 days
 */
export async function test_api_user_join_success(
  connection: api.IConnection,
): Promise<void> {
  // Prepare valid registration data
  const email = typia.random<string & tags.MaxLength<254> & tags.Format<"email">>();
  const password = "StrongP@ss123!"; // Meets complexity: 8+ chars, uppercase, lowercase, digit, special char
  const joinBody = {
    email,
    password,
    password_confirm: password,
    href: "https://example.com/signup",
    referrer: "https://example.com/",
  } satisfies ITodoAppUser.IJoin;
  // Call the join endpoint
  const response = await api.functional.todoApp.auth.user.join(connection, {
    body: joinBody,
  });
  typia.assert(response);
  // Verify response structure - typia.assert validates types completely
  // Business logic validations:
  TestValidator.equals(
    "display_name defaults to email",
    response.display_name,
    email satisfies string as string,
  );
  // Verify token structure exists
  TestValidator.predicate(
    "access token present",
    response.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token present",
    response.token.refresh.length > 0,
  );
  // Verify token expiration timestamps are reasonable
  const now = new Date();
  const expiredAt = new Date(response.token.expired_at);
  const refreshableUntil = new Date(response.token.refreshable_until);
  // Access token should expire in approximately 15 minutes (allow 1 minute tolerance)
  const accessExpiresIn = expiredAt.getTime() - now.getTime();
  const fifteenMinutes = 15 * 60 * 1000;
  TestValidator.predicate(
    "access token expires in ~15 minutes",
    Math.abs(accessExpiresIn - fifteenMinutes) < 60 * 1000,
  );
  // Refresh token should be valid for approximately 30 days (allow 1 day tolerance)
  const refreshValidFor = refreshableUntil.getTime() - now.getTime();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  TestValidator.predicate(
    "refresh token valid for ~30 days",
    Math.abs(refreshValidFor - thirtyDays) < 24 * 60 * 60 * 1000,
  );
}
