import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalDiscussionContentModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionContentModerator";

/**
 * Test content moderator login with malformed request data validation.
 *
 * This test validates the login endpoint's ability to handle and reject various
 * types of malformed authentication data while maintaining security. It tests
 * email format validation, required field enforcement, and business logic
 * validation for the content moderator authentication system.
 *
 * The test ensures that invalid login attempts are properly rejected with
 * appropriate error responses, preventing security vulnerabilities while
 * providing feedback for legitimate authentication issues.
 *
 * Test Flow:
 *
 * 1. Create valid content moderator account via join endpoint
 * 2. Test malformed login requests with invalid email formats
 * 3. Test missing required field scenarios
 * 4. Test business logic validation (wrong credentials)
 * 5. Verify all malformed requests properly fail with errors
 */
export async function test_api_moderator_login_malformed_data(
  connection: api.IConnection,
) {
  // Step 1: Setup - Create a valid content moderator account for testing
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "SecurePass123!";

  await api.functional.auth.contentModerator.join.register(connection, {
    body: {
      display_name: "Test Moderator",
      email: moderatorEmail,
      password: moderatorPassword,
      bio: "Test moderator account for validation testing",
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEconPoliticalDiscussionContentModerator.ICreate,
  });

  // Step 2: Test malformed email formats
  await TestValidator.error(
    "login with invalid email format missing @ symbol",
    async () => {
      await api.functional.auth.contentModerator.login.authenticate(
        connection,
        {
          body: {
            email: "invalidemail.com",
            password: moderatorPassword,
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
          } satisfies IEconPoliticalDiscussionContentModerator.ILogin,
        },
      );
    },
  );

  await TestValidator.error(
    "login with invalid email format missing domain",
    async () => {
      await api.functional.auth.contentModerator.login.authenticate(
        connection,
        {
          body: {
            email: "user@",
            password: moderatorPassword,
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
          } satisfies IEconPoliticalDiscussionContentModerator.ILogin,
        },
      );
    },
  );

  await TestValidator.error(
    "login with malformed email with spaces",
    async () => {
      await api.functional.auth.contentModerator.login.authenticate(
        connection,
        {
          body: {
            email: "user @example.com",
            password: moderatorPassword,
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
          } satisfies IEconPoliticalDiscussionContentModerator.ILogin,
        },
      );
    },
  );

  // Step 3: Test invalid business logic scenarios
  await TestValidator.error(
    "login with non-existent email address",
    async () => {
      await api.functional.auth.contentModerator.login.authenticate(
        connection,
        {
          body: {
            email: "nonexistent@example.com",
            password: moderatorPassword,
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
          } satisfies IEconPoliticalDiscussionContentModerator.ILogin,
        },
      );
    },
  );

  await TestValidator.error(
    "login with correct email but wrong password",
    async () => {
      await api.functional.auth.contentModerator.login.authenticate(
        connection,
        {
          body: {
            email: moderatorEmail,
            password: "WrongPassword123!",
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
          } satisfies IEconPoliticalDiscussionContentModerator.ILogin,
        },
      );
    },
  );

  // Step 4: Test various invalid password scenarios
  await TestValidator.error("login with empty password", async () => {
    await api.functional.auth.contentModerator.login.authenticate(connection, {
      body: {
        email: moderatorEmail,
        password: "",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEconPoliticalDiscussionContentModerator.ILogin,
    });
  });

  await TestValidator.error("login with very short password", async () => {
    await api.functional.auth.contentModerator.login.authenticate(connection, {
      body: {
        email: moderatorEmail,
        password: "123",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEconPoliticalDiscussionContentModerator.ILogin,
    });
  });

  // Step 5: Test missing required URI fields
  await TestValidator.error("login with invalid href URI format", async () => {
    await api.functional.auth.contentModerator.login.authenticate(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        href: "not-a-valid-uri",
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEconPoliticalDiscussionContentModerator.ILogin,
    });
  });

  await TestValidator.error(
    "login with invalid referrer URI format",
    async () => {
      await api.functional.auth.contentModerator.login.authenticate(
        connection,
        {
          body: {
            email: moderatorEmail,
            password: moderatorPassword,
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: "invalid-referrer-format",
          } satisfies IEconPoliticalDiscussionContentModerator.ILogin,
        },
      );
    },
  );
}
