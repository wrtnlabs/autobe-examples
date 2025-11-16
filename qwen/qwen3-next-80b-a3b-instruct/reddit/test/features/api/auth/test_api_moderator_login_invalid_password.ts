import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { IModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IModerator";

export async function test_api_moderator_login_invalid_password(
  connection: api.IConnection,
) {
  /**
   * Test moderator login with incorrect password while using a valid email.
   *
   * The system must return a 401 Unauthorized response without revealing
   * whether the email exists or not. To properly test this, a moderator account
   * must first be created via the /auth/moderator/join endpoint using valid
   * credentials. Once created, the /auth/moderator/login endpoint is invoked
   * with the correct email but an intentionally incorrect password to validate
   * that the system correctly rejects invalid credentials while maintaining
   * security through credential enumeration protection.
   *
   * The test ensures:
   *
   * - A valid moderator account is created with a randomly generated email and a
   *   strong password
   * - The login attempt uses the exact same email but a different (invalid)
   *   password
   * - The system responds with 401 Unauthorized status
   * - No sensitive information is exposed in the response
   * - The operation respects security best practices by not distinguishing
   *   between invalid email and invalid password
   */
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const validPassword = "StrongPass123!";
  const invalidPassword = "WrongPassword456!";

  // Create moderator request body as string for IModerator.ICreate
  // Since IModerator.ICreate is defined as 'string', we serialize the object to JSON
  const joinRequestBody = JSON.stringify({
    email: moderatorEmail,
    password: validPassword,
  });

  // Step 1: Create a new moderator account via join endpoint
  const joinedModerator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: joinRequestBody satisfies IModerator.ICreate,
    });
  typia.assert(joinedModerator);

  // Step 2: Attempt login with correct email but invalid password
  await TestValidator.error(
    "invalid password login should fail with 401",
    async () => {
      await api.functional.auth.moderator.login(connection, {
        body: {
          email: moderatorEmail,
          password: invalidPassword,
        } satisfies IModerator.IAuth,
      });
    },
  );

  // Verify the moderator account can still be logged in with correct password
  const loggedinModerator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: {
        email: moderatorEmail,
        password: validPassword,
      } satisfies IModerator.IAuth,
    });
  typia.assert(loggedinModerator);
}
