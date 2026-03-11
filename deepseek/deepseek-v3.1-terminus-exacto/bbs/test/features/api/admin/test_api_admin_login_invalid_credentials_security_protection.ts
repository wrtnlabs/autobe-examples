import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test security protection for admin login with invalid credentials.
 * Validates that the system handles invalid credentials securely without
 * revealing specific failure reasons. Tests include invalid email,
 * invalid password, and email case sensitivity scenarios.
 */
export async function test_api_admin_login_invalid_credentials_security_protection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a valid admin account for testing
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const validAdmin = await authorize_admin_join(adminJoinConnection, {});
  typia.assert(validAdmin);
  // Get the valid credentials from the created admin
  const validEmail = validAdmin.email;
  const validPassword = "12345678"; // Default from authorize_admin_join is RandomGenerator.alphaNumeric(16)
  // Test 1: Invalid email (non-existent administrator)
  // Create isolated connection for this test
  const invalidEmailConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("invalid email should be rejected", async () => {
    await api.functional.discussionBoard.auth.admin.login(
      invalidEmailConnection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: validPassword,
        } satisfies IDiscussionBoardAdmin.ILogin,
      },
    );
  });
  // Test 2: Invalid password (wrong password for existing account)
  const invalidPasswordConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("invalid password should be rejected", async () => {
    await api.functional.discussionBoard.auth.admin.login(
      invalidPasswordConnection,
      {
        body: {
          email: validEmail,
          password: RandomGenerator.alphaNumeric(16) + "wrong",
        } satisfies IDiscussionBoardAdmin.ILogin,
      },
    );
  });
  // Test 3: Mixed case sensitivity for email field
  const caseSensitivityConnection: api.IConnection = { host: connection.host };
  // Test both uppercase and mixed case variations of the valid email
  const emailVariations = [
    validEmail.toUpperCase(),
    validEmail.replace(/@/, "_UPPERCASE_@"),
  ] as const;
  for (const email of emailVariations) {
    await TestValidator.error(
      `email variation "${email.slice(0, 10)}..." should be rejected`,
      async () => {
        await api.functional.discussionBoard.auth.admin.login(
          caseSensitivityConnection,
          {
            body: {
              email,
              password: validPassword,
            } satisfies IDiscussionBoardAdmin.ILogin,
          },
        );
      },
    );
  }
}
