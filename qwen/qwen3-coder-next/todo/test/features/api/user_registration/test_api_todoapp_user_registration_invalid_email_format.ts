import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_todoapp_user_registration_invalid_email_format(
  connection: api.IConnection,
): Promise<void> {
  // Test various invalid email formats
  const invalidEmails = [
    "invalid-email", // missing @ symbol
    "@domain.com", // missing local part
    "user@", // missing domain
    "user name@domain.com", // space in local part
    "user@domain", // missing TLD
    "user@domain.c", // TLD too short
    "user@-domain.com", // domain starts with hyphen
    "user@domain.-com", // domain ends with hyphen
    "user@domain..com", // consecutive dots in domain
    "user..name@domain.com", // consecutive dots in local part
    "", // empty string
    "simple", // no @ at all
    "user@@domain.com", // double @
    "user@domain,com", // comma instead of dot
  ];
  // Test each invalid email format
  for (const invalidEmail of invalidEmails) {
    await TestValidator.error(
      'should reject invalid email format: "' + invalidEmail + '"',
      async () => {
        await api.functional.todoApp.auth.user.join(connection, {
          body: {
            email: invalidEmail,
            password: "password123",
          } satisfies ITodoAppUser.IJoin,
        });
      },
    );
  }
  // Test with empty password (should also fail validation)
  await TestValidator.error("should reject empty password", async () => {
    await api.functional.todoApp.auth.user.join(connection, {
      body: {
        email: "test@example.com",
        password: "",
      } satisfies ITodoAppUser.IJoin,
    });
  });
  // Test with password less than 8 characters (weak password)
  await TestValidator.error(
    "should reject weak password (less than 8 chars)",
    async () => {
      await api.functional.todoApp.auth.user.join(connection, {
        body: {
          email: "test@example.com",
          password: "short",
        } satisfies ITodoAppUser.IJoin,
      });
    },
  );
  // Test with valid email to ensure system can accept valid registrations
  const validEmail = typia.random<string & tags.Format<"email">>();
  const validPassword = "password123";
  const result = await api.functional.todoApp.auth.user.join(connection, {
    body: {
      email: validEmail,
      password: validPassword,
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(result);
  // Verify the result structure
  TestValidator.equals("should return authorized user", "id" in result, true);
  TestValidator.equals("should have valid email", result.email, validEmail);
  TestValidator.equals(
    "should have valid token structure",
    "access" in result.token,
    true,
  );
}
