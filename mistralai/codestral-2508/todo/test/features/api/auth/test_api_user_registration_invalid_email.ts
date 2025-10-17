import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_user_registration_invalid_email(
  connection: api.IConnection,
) {
  // Test with invalid email format
  const invalidEmail = "invalid-email";

  // Attempt to register with invalid email
  await TestValidator.error("should reject invalid email format", async () => {
    await api.functional.auth.user.join(connection, {
      body: {
        email: invalidEmail,
        password: "validPassword123",
      } satisfies ITodoListUser.ICreate,
    });
  });

  // Test with empty email
  const emptyEmail = "";

  await TestValidator.error("should reject empty email", async () => {
    await api.functional.auth.user.join(connection, {
      body: {
        email: emptyEmail,
        password: "validPassword123",
      } satisfies ITodoListUser.ICreate,
    });
  });

  // Test with email missing @ symbol
  const missingAtEmail = "invalid.email";

  await TestValidator.error(
    "should reject email missing @ symbol",
    async () => {
      await api.functional.auth.user.join(connection, {
        body: {
          email: missingAtEmail,
          password: "validPassword123",
        } satisfies ITodoListUser.ICreate,
      });
    },
  );

  // Test with email missing domain part
  const missingDomainEmail = "invalid@";

  await TestValidator.error(
    "should reject email missing domain part",
    async () => {
      await api.functional.auth.user.join(connection, {
        body: {
          email: missingDomainEmail,
          password: "validPassword123",
        } satisfies ITodoListUser.ICreate,
      });
    },
  );

  // Test with email missing local part
  const missingLocalEmail = "@example.com";

  await TestValidator.error(
    "should reject email missing local part",
    async () => {
      await api.functional.auth.user.join(connection, {
        body: {
          email: missingLocalEmail,
          password: "validPassword123",
        } satisfies ITodoListUser.ICreate,
      });
    },
  );

  // Test with email with spaces
  const emailWithSpaces = "invalid email@example.com";

  await TestValidator.error("should reject email with spaces", async () => {
    await api.functional.auth.user.join(connection, {
      body: {
        email: emailWithSpaces,
        password: "validPassword123",
      } satisfies ITodoListUser.ICreate,
    });
  });

  // Test with email with special characters
  const emailWithSpecialChars = "invalid!email@example.com";

  await TestValidator.error(
    "should reject email with special characters",
    async () => {
      await api.functional.auth.user.join(connection, {
        body: {
          email: emailWithSpecialChars,
          password: "validPassword123",
        } satisfies ITodoListUser.ICreate,
      });
    },
  );

  // Test with email with multiple @ symbols
  const emailWithMultipleAts = "invalid@@email@example.com";

  await TestValidator.error(
    "should reject email with multiple @ symbols",
    async () => {
      await api.functional.auth.user.join(connection, {
        body: {
          email: emailWithMultipleAts,
          password: "validPassword123",
        } satisfies ITodoListUser.ICreate,
      });
    },
  );

  // Test with email with leading or trailing spaces
  const emailWithLeadingTrailingSpaces = " invalid@email.com ";

  await TestValidator.error(
    "should reject email with leading or trailing spaces",
    async () => {
      await api.functional.auth.user.join(connection, {
        body: {
          email: emailWithLeadingTrailingSpaces,
          password: "validPassword123",
        } satisfies ITodoListUser.ICreate,
      });
    },
  );

  // Test with email with invalid domain
  const emailWithInvalidDomain = "invalid@email..com";

  await TestValidator.error(
    "should reject email with invalid domain",
    async () => {
      await api.functional.auth.user.join(connection, {
        body: {
          email: emailWithInvalidDomain,
          password: "validPassword123",
        } satisfies ITodoListUser.ICreate,
      });
    },
  );
}
