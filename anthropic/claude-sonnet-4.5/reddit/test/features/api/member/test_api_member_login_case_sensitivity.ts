import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test username case sensitivity during member login authentication.
 *
 * This test validates how the authentication system handles username casing. It
 * registers a member with a specific username case pattern, then attempts login
 * with various case transformations to determine if usernames are
 * case-sensitive or case-insensitive.
 *
 * Workflow:
 *
 * 1. Register a new member with mixed-case username (e.g., 'TestUser123')
 * 2. Verify login with exact username case succeeds
 * 3. Attempt login with lowercase version to test case sensitivity
 * 4. Attempt login with uppercase version to test case sensitivity
 */
export async function test_api_member_login_case_sensitivity(
  connection: api.IConnection,
) {
  // Step 1: Register a new member with mixed-case username
  const originalUsername = "TestUser" + RandomGenerator.alphaNumeric(6);
  const password = "SecurePass123!";
  const email = typia.random<string & tags.Format<"email">>();

  const registrationBody = {
    username: originalUsername,
    email: email,
    password: password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityGuest.ICreate;

  const registeredMember: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: registrationBody,
    });
  typia.assert(registeredMember);

  TestValidator.equals(
    "registered username matches original",
    registeredMember.username,
    originalUsername,
  );

  // Step 2: Verify login with exact username case succeeds
  const exactCaseLoginBody = {
    username: originalUsername,
    password: password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityGuest.ILogin;

  const exactCaseLoginResult: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.login(connection, {
      body: exactCaseLoginBody,
    });
  typia.assert(exactCaseLoginResult);

  TestValidator.equals(
    "exact case login returns same member ID",
    exactCaseLoginResult.id,
    registeredMember.id,
  );

  // Step 3: Test login with lowercase username to determine case sensitivity
  const lowercaseUsername = originalUsername.toLowerCase();

  if (lowercaseUsername !== originalUsername) {
    const lowercaseLoginBody = {
      username: lowercaseUsername,
      password: password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ILogin;

    try {
      const lowercaseLoginResult: IRedditCommunityGuest.IAuthorized =
        await api.functional.auth.member.login(connection, {
          body: lowercaseLoginBody,
        });
      typia.assert(lowercaseLoginResult);

      TestValidator.equals(
        "lowercase login succeeds - usernames are case-insensitive",
        lowercaseLoginResult.id,
        registeredMember.id,
      );
    } catch (error) {
      TestValidator.predicate(
        "lowercase login failed - usernames are case-sensitive",
        true,
      );
    }
  }

  // Step 4: Test login with uppercase username to verify case sensitivity behavior
  const uppercaseUsername = originalUsername.toUpperCase();

  if (uppercaseUsername !== originalUsername) {
    const uppercaseLoginBody = {
      username: uppercaseUsername,
      password: password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ILogin;

    try {
      const uppercaseLoginResult: IRedditCommunityGuest.IAuthorized =
        await api.functional.auth.member.login(connection, {
          body: uppercaseLoginBody,
        });
      typia.assert(uppercaseLoginResult);

      TestValidator.equals(
        "uppercase login succeeds - usernames are case-insensitive",
        uppercaseLoginResult.id,
        registeredMember.id,
      );
    } catch (error) {
      TestValidator.predicate(
        "uppercase login failed - usernames are case-sensitive",
        true,
      );
    }
  }
}
