import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussVerifiedExpert } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpert";
import type { IEconDiscussVerifiedExpertJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpertJoin";

/**
 * Register a verified expert account successfully with preferences.
 *
 * Purpose
 *
 * - Ensures POST /auth/verifiedExpert/join creates a new identity and returns an
 *   authorization envelope containing initial flags and token bundle.
 * - Verifies that optional preferences (timezone, locale) are persisted and
 *   echoed in the response payload.
 *
 * Steps
 *
 * 1. Prepare a valid registration payload with unique email, strong password,
 *    display_name, and optional preferences timezone="Asia/Seoul",
 *    locale="en-US".
 * 2. Call join API and assert response type with typia.assert().
 * 3. Validate business rules:
 *
 *    - Role === "verifiedExpert"
 *    - Token.access is a non-empty string
 *    - Email_verified === false and mfa_enabled === false
 *    - Display_name equals input
 *    - Timezone and locale equal input preferences
 */
export async function test_api_verified_expert_registration_success_with_preferences(
  connection: api.IConnection,
) {
  // 1) Prepare request payload (IEconDiscussVerifiedExpertJoin.ICreate)
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12); // >= 8 chars
  const displayName = RandomGenerator.name(1); // at least 1 word
  const timezone = "Asia/Seoul";
  const locale = "en-US";

  const body = {
    email,
    password,
    display_name: displayName,
    timezone,
    locale,
  } satisfies IEconDiscussVerifiedExpertJoin.ICreate;

  // 2) Execute API call
  const auth: IEconDiscussVerifiedExpert.IAuthorized =
    await api.functional.auth.verifiedExpert.join(connection, { body });

  // Type validation - complete structure including nested token
  typia.assert(auth);

  // 3) Business validations
  TestValidator.equals(
    "role fixed to verifiedExpert after join",
    auth.role,
    "verifiedExpert",
  );

  TestValidator.equals(
    "email_verified initialized to false",
    auth.email_verified,
    false,
  );

  TestValidator.equals(
    "mfa_enabled initialized to false",
    auth.mfa_enabled,
    false,
  );

  TestValidator.equals(
    "display_name echoes input",
    auth.display_name,
    displayName,
  );

  TestValidator.equals(
    "timezone preference reflected in authorization payload",
    auth.timezone,
    timezone,
  );

  TestValidator.equals(
    "locale preference reflected in authorization payload",
    auth.locale,
    locale,
  );

  TestValidator.predicate(
    "access token string is non-empty",
    auth.token.access.length > 0,
  );
}
