import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";

/**
 * Validate password security requirements during contributor registration.
 *
 * This test verifies that the registration endpoint properly enforces password
 * security constraints. Weak passwords that fail to meet security requirements
 * (minimum length, uppercase, lowercase, numbers, special characters) must be
 * rejected by the API.
 *
 * Test scenarios:
 *
 * 1. Password too short (less than 8 characters) - should fail
 * 2. Password missing uppercase letters - should fail
 * 3. Password missing lowercase letters - should fail
 * 4. Password missing numeric digits - should fail
 * 5. Password missing special characters - should fail
 * 6. Valid password meeting all requirements - should succeed
 */
export async function test_api_contributor_registration_password_validation(
  connection: api.IConnection,
) {
  // Generate valid test data
  const validEmail = typia.random<string & tags.Format<"email">>();
  const validUsername = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<50> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">
  >();
  const validHref = typia.random<string & tags.Format<"uri">>();
  const validReferrer = typia.random<string & tags.Format<"uri">>();

  // Test 1: Password too short (less than 8 characters)
  await TestValidator.error(
    "password shorter than 8 characters should be rejected",
    async () => {
      await api.functional.auth.contributor.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          username: validUsername,
          password: "Short1!",
          href: validHref,
          referrer: validReferrer,
        } satisfies IDiscussionBoardContributor.ICreate,
      });
    },
  );

  // Test 2: Password missing uppercase letters
  await TestValidator.error(
    "password without uppercase letters should be rejected",
    async () => {
      await api.functional.auth.contributor.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          username: validUsername,
          password: "nouppqrcase1!",
          href: validHref,
          referrer: validReferrer,
        } satisfies IDiscussionBoardContributor.ICreate,
      });
    },
  );

  // Test 3: Password missing lowercase letters
  await TestValidator.error(
    "password without lowercase letters should be rejected",
    async () => {
      await api.functional.auth.contributor.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          username: validUsername,
          password: "NOLOWERCASE1!",
          href: validHref,
          referrer: validReferrer,
        } satisfies IDiscussionBoardContributor.ICreate,
      });
    },
  );

  // Test 4: Password missing numeric digits
  await TestValidator.error(
    "password without numeric digits should be rejected",
    async () => {
      await api.functional.auth.contributor.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          username: validUsername,
          password: "NoDigits!Abc",
          href: validHref,
          referrer: validReferrer,
        } satisfies IDiscussionBoardContributor.ICreate,
      });
    },
  );

  // Test 5: Password missing special characters
  await TestValidator.error(
    "password without special characters should be rejected",
    async () => {
      await api.functional.auth.contributor.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          username: validUsername,
          password: "NoSpecialChar1",
          href: validHref,
          referrer: validReferrer,
        } satisfies IDiscussionBoardContributor.ICreate,
      });
    },
  );

  // Test 6: Valid password meeting all requirements should succeed
  const validPassword = "ValidPassword123!";
  const successfulRegistration = await api.functional.auth.contributor.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<50> &
            tags.Pattern<"^[a-zA-Z0-9_]+$">
        >(),
        password: validPassword,
        href: validHref,
        referrer: validReferrer,
      } satisfies IDiscussionBoardContributor.ICreate,
    },
  );

  typia.assert(successfulRegistration);
  TestValidator.predicate(
    "successful registration should return IAuthorized with token",
    successfulRegistration.token !== undefined &&
      successfulRegistration.token.access !== undefined &&
      successfulRegistration.token.refresh !== undefined,
  );
  TestValidator.equals(
    "registered contributor account status should be active",
    successfulRegistration.account_status,
    "active",
  );
  TestValidator.predicate(
    "email should not be verified on registration",
    successfulRegistration.email_verified === false,
  );
}
