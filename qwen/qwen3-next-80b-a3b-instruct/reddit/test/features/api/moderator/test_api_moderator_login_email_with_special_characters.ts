import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { IModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IModerator";

/**
 * Test moderator login with valid special characters in email.
 *
 * This test verifies that the moderator authentication system correctly handles
 * email addresses containing special characters as defined by RFC 5322.
 *
 * The test follows this workflow:
 *
 * 1. Create a new moderator account using an email with special characters (+, .)
 * 2. Login using the same email with special characters to verify system handles
 *    them correctly
 * 3. Validate successful login and token issuance
 */
export async function test_api_moderator_login_email_with_special_characters(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account with special characters in email
  const specialEmail = `moderator+test@community.dev`;
  const password = "SecurePass123!";
  const joinResponse: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: specialEmail satisfies IModerator.ICreate,
    });
  typia.assert(joinResponse);

  // Step 2: Login using the same email with special characters
  const loginResponse: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: {
        email: specialEmail,
        password,
      } satisfies IModerator.IAuth,
    });
  typia.assert(loginResponse);

  // Step 3: Validate successful login
  TestValidator.equals(
    "token exists after login",
    loginResponse.token.access,
    joinResponse.token.access,
  );
  TestValidator.equals(
    "moderator IDs match",
    loginResponse.id,
    joinResponse.id,
  );
}
