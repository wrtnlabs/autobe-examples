import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Validates that weak passwords are rejected during password change operations.
 *
 * Tests that the administrator password change endpoint properly enforces
 * password security requirements. When an administrator attempts to change
 * their password to a weak password (less than 8 characters, missing character
 * diversity), the operation should be rejected with appropriate error
 * messaging.
 *
 * Process:
 *
 * 1. Create administrator account via join endpoint
 * 2. Attempt password change with weak password (less than 8 chars)
 * 3. Verify operation fails due to password weakness
 */
export async function test_api_administrator_password_change_weak_password(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account with valid credentials
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const strongPassword = "SecurePass123";

  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: strongPassword,
        username: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(),
        href: "http://localhost:3000/admin",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);

  // Step 2: Attempt password change with weak password (too short)
  const weakPassword = "short";
  await TestValidator.error(
    "weak password should be rejected during password change",
    async () => {
      await api.functional.communityPlatform.administrator.auth.administrator.password_change.changePassword(
        connection,
        {
          body: {
            current_password: strongPassword,
            new_password: weakPassword,
            new_password_confirm: weakPassword,
          } satisfies ICommunityPlatformAdministrator.IPasswordChange,
        },
      );
    },
  );

  // Step 3: Attempt password change with password lacking uppercase letters
  const noUppercasePassword = "lowercase123";
  await TestValidator.error(
    "password without uppercase should be rejected",
    async () => {
      await api.functional.communityPlatform.administrator.auth.administrator.password_change.changePassword(
        connection,
        {
          body: {
            current_password: strongPassword,
            new_password: noUppercasePassword,
            new_password_confirm: noUppercasePassword,
          } satisfies ICommunityPlatformAdministrator.IPasswordChange,
        },
      );
    },
  );

  // Step 4: Attempt password change with password lacking lowercase letters
  const noLowercasePassword = "UPPERCASE123";
  await TestValidator.error(
    "password without lowercase should be rejected",
    async () => {
      await api.functional.communityPlatform.administrator.auth.administrator.password_change.changePassword(
        connection,
        {
          body: {
            current_password: strongPassword,
            new_password: noLowercasePassword,
            new_password_confirm: noLowercasePassword,
          } satisfies ICommunityPlatformAdministrator.IPasswordChange,
        },
      );
    },
  );

  // Step 5: Attempt password change with password lacking numeric characters
  const noNumberPassword = "OnlyLetters";
  await TestValidator.error(
    "password without numbers should be rejected",
    async () => {
      await api.functional.communityPlatform.administrator.auth.administrator.password_change.changePassword(
        connection,
        {
          body: {
            current_password: strongPassword,
            new_password: noNumberPassword,
            new_password_confirm: noNumberPassword,
          } satisfies ICommunityPlatformAdministrator.IPasswordChange,
        },
      );
    },
  );
}
