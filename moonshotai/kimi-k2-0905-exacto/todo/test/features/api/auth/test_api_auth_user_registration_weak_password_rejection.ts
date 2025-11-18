import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test password validation functionality during user registration, focusing on
 * rejection of weak passwords.
 *
 * This test validates that the API properly rejects passwords that don't meet
 * security requirements, specifically testing minimum length constraints and
 * ensuring proper error handling for insufficient password strength. The test
 * scenarios include:
 *
 * 1. Attempt registration with a password that's too short (below minimum
 *    requirements)
 * 2. Verify the API rejects the weak password with appropriate error handling
 * 3. Demonstrate that valid passwords are accepted when other requirements are met
 * 4. Test edge cases around password length boundaries
 *
 * The test focuses on business logic validation rather than type checking,
 * ensuring the password validation system enforces modern security standards
 * while providing clear guidance to users.
 */
export async function test_api_auth_user_registration_weak_password_rejection(
  connection: api.IConnection,
) {
  // Generate valid email and other required fields
  const validEmail = typia.random<string & tags.Format<"email">>();
  const validName = RandomGenerator.name();
  const validHref = "https://example.com/register";
  const validReferrer = "https://example.com/login";

  // Test 1: Attempt registration with a weak password (too short)
  const weakPasswordBody = {
    email: validEmail,
    password: "123", // Too short password (likely below minimum requirements)
    name: validName,
    href: validHref,
    referrer: validReferrer,
  } satisfies ITodoAppUser.ICreate;

  // Expect the API to reject weak passwords
  await TestValidator.error("weak password should be rejected", async () => {
    await api.functional.auth.user.join(connection, {
      body: weakPasswordBody,
    });
  });

  // Test 2: Attempt registration with another weak password scenario
  const veryShortPasswordBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "a", // Single character password
    name: RandomGenerator.name(),
    href: validHref,
    referrer: validReferrer,
  } satisfies ITodoAppUser.ICreate;

  await TestValidator.error(
    "very short password should be rejected",
    async () => {
      await api.functional.auth.user.join(connection, {
        body: veryShortPasswordBody,
      });
    },
  );

  // Test 3: Verify that a valid password is accepted
  const validPasswordBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "StrongPassword123!", // Valid password meeting requirements
    name: RandomGenerator.name(),
    href: validHref,
    referrer: validReferrer,
  } satisfies ITodoAppUser.ICreate;

  const validUser = await api.functional.auth.user.join(connection, {
    body: validPasswordBody,
  });

  // Verify the valid registration succeeded
  typia.assert(validUser);
  TestValidator.equals(
    "user email matches",
    validUser.email,
    validPasswordBody.email,
  );
  TestValidator.equals(
    "user name matches",
    validUser.name,
    validPasswordBody.name,
  );
  TestValidator.predicate(
    "user has valid ID",
    typia.is<string & tags.Format<"uuid">>(validUser.id),
  );
  TestValidator.predicate("user is active", validUser.status === "active");

  // Test 4: Test password length boundary (empty password)
  const emptyPasswordBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "", // Empty password
    name: RandomGenerator.name(),
    href: validHref,
    referrer: validReferrer,
  } satisfies ITodoAppUser.ICreate;

  await TestValidator.error("empty password should be rejected", async () => {
    await api.functional.auth.user.join(connection, {
      body: emptyPasswordBody,
    });
  });
}
