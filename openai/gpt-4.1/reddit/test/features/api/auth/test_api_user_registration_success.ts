import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Validate successful user registration and onboarding flow.
 *
 * Confirms end-to-end user onboarding at the /auth/user/join API, including
 * email uniqueness, password policy adherence, system record creation, and
 * issuance of proper JWT authentication tokens.
 *
 * Steps:
 *
 * 1. Prepare a unique, valid email and strong password
 * 2. Submit the registration request via api.functional.auth.user.join
 * 3. Validate the returned user identity and tokens conform to type and business
 *    requirements
 * 4. Confirm critical user fields (id, email, status, timestamps) are properly
 *    initialized
 * 5. Validate token structure (access, refresh, expiration times) for
 *    authentication/session establishment
 */
export async function test_api_user_registration_success(
  connection: api.IConnection,
) {
  // 1. Prepare a unique, valid email (string & tags.Format<"email">)
  const email = typia.random<string & tags.Format<"email">>();
  // 2. Prepare a strong password (string & tags.Format<"password">)
  const password = typia.random<string & tags.Format<"password">>();
  // 3. Compose registration body
  const requestBody = {
    email,
    password,
  } satisfies ICommunityPlatformUser.IJoin;
  // 4. Register user via API
  const result = await api.functional.auth.user.join(connection, {
    body: requestBody,
  });
  // 5. Assert authorized user DTO and JWT tokens
  typia.assert(result);
  // 6. Validate user fields
  TestValidator.predicate(
    "user id is a uuid",
    typeof result.id === "string" && result.id.length > 0,
  );
  TestValidator.equals("user email matches input", result.email, email);
  TestValidator.predicate(
    "user status is a non-empty string",
    typeof result.status === "string" && result.status.length > 0,
  );
  TestValidator.predicate(
    "created_at and updated_at are ISO 8601 date-time",
    typeof result.created_at === "string" &&
      typeof result.updated_at === "string" &&
      result.created_at.length > 0 &&
      result.updated_at.length > 0,
  );
  // 7. Validate token structure
  TestValidator.predicate(
    "token.access is a string",
    typeof result.token.access === "string" && result.token.access.length > 0,
  );
  TestValidator.predicate(
    "token.refresh is a string",
    typeof result.token.refresh === "string" && result.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token expired_at is ISO 8601",
    typeof result.token.expired_at === "string" &&
      result.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "token refreshable_until is ISO 8601",
    typeof result.token.refreshable_until === "string" &&
      result.token.refreshable_until.length > 0,
  );
}
