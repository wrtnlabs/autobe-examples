import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalDiscussionGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionGuestUser";

/**
 * Test guest user registration with invalid email format validation.
 *
 * Validates that the API properly rejects malformed email addresses during
 * guest user registration. This test ensures email format validation is working
 * correctly by testing various invalid email formats including missing @
 * symbol, invalid domain names, and other formatting issues. The email field
 * requires strict Format<"email"> validation to maintain data integrity and
 * prevent invalid account creation in the discussion board system.
 */
export async function test_api_guest_user_invalid_email_format(
  connection: api.IConnection,
) {
  // Test missing @ symbol - basic email format validation
  await TestValidator.error(
    "should reject email without @ symbol",
    async () => {
      await api.functional.auth.guestUser.join(connection, {
        body: {
          display_name: "TestUser",
          email: "invalidemail.com",
        } satisfies IEconPoliticalDiscussionGuestUser.ICreate,
      });
    },
  );

  // Test missing domain - incomplete email structure
  await TestValidator.error("should reject email without domain", async () => {
    await api.functional.auth.guestUser.join(connection, {
      body: {
        display_name: "TestUser",
        email: "user@",
      } satisfies IEconPoliticalDiscussionGuestUser.ICreate,
    });
  });

  // Test multiple @ symbols - malformed email structure
  await TestValidator.error(
    "should reject email with multiple @ symbols",
    async () => {
      await api.functional.auth.guestUser.join(connection, {
        body: {
          display_name: "TestUser",
          email: "user@@domain.com",
        } satisfies IEconPoliticalDiscussionGuestUser.ICreate,
      });
    },
  );

  // Test invalid characters in email
  await TestValidator.error(
    "should reject email with invalid characters",
    async () => {
      await api.functional.auth.guestUser.join(connection, {
        body: {
          display_name: "TestUser",
          email: "user name@domain.com",
        } satisfies IEconPoliticalDiscussionGuestUser.ICreate,
      });
    },
  );

  // Test empty email field - boundary validation
  await TestValidator.error("should reject empty email", async () => {
    await api.functional.auth.guestUser.join(connection, {
      body: {
        display_name: "TestUser",
        email: "",
      } satisfies IEconPoliticalDiscussionGuestUser.ICreate,
    });
  });

  // Test just @ symbol - invalid structure
  await TestValidator.error(
    "should reject email with just @ symbol",
    async () => {
      await api.functional.auth.guestUser.join(connection, {
        body: {
          display_name: "TestUser",
          email: "@",
        } satisfies IEconPoliticalDiscussionGuestUser.ICreate,
      });
    },
  );

  // Test missing username part
  await TestValidator.error(
    "should reject email missing username",
    async () => {
      await api.functional.auth.guestUser.join(connection, {
        body: {
          display_name: "TestUser",
          email: "@domain.com",
        } satisfies IEconPoliticalDiscussionGuestUser.ICreate,
      });
    },
  );

  // Test valid email format to ensure normal operation still works
  const validUser = await api.functional.auth.guestUser.join(connection, {
    body: {
      display_name: "ValidUser",
      email: "valid.user@domain.com",
    } satisfies IEconPoliticalDiscussionGuestUser.ICreate,
  });
  typia.assert(validUser);
  TestValidator.equals(
    "valid email should succeed",
    validUser.email,
    "valid.user@domain.com",
  );
}
