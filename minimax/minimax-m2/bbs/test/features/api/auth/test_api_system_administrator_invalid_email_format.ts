import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalDiscussionSystemAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionSystemAdministrator";
import type { IEconPoliticalDiscussionUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionUser";

/**
 * Test system administrator account creation with invalid email format
 * validation.
 *
 * This test validates the email format validation rules for system
 * administrator registration. It ensures that malformed email addresses are
 * properly rejected during the account creation process, preventing invalid
 * admin accounts from being established in the system. The test covers various
 * invalid email patterns including missing @ symbols, multiple @ symbols,
 * invalid domain formats, and other common email format violations that could
 * compromise system security and data integrity if allowed.
 */
export async function test_api_system_administrator_invalid_email_format(
  connection: api.IConnection,
) {
  // Test various invalid email formats that should be rejected
  const invalidEmailFormats = [
    "no-at-symbol",
    "missing-domain@",
    "@missing-local.com",
    "double@@domain.com",
    "spaces in@email.com",
    "invalid..dots@domain.com",
    "missing-tld@domain",
    "invalid-char@domain!.com",
  ];

  // Test each invalid email format
  for (const invalidEmail of invalidEmailFormats) {
    await TestValidator.error(
      `system administrator creation should fail with invalid email: ${invalidEmail}`,
      async () => {
        await api.functional.auth.systemAdministrator.join.create(connection, {
          body: {
            display_name: RandomGenerator.name(),
            email: invalidEmail,
            status: "active",
            bio: RandomGenerator.paragraph(),
          } satisfies IEconPoliticalDiscussionUser.ICreate,
        });
      },
    );
  }

  // Verify that a valid email format is accepted (baseline test)
  const validAdmin = await api.functional.auth.systemAdministrator.join.create(
    connection,
    {
      body: {
        display_name: RandomGenerator.name(),
        email: typia.random<string & tags.Format<"email">>(),
        status: "active",
        bio: RandomGenerator.paragraph(),
      } satisfies IEconPoliticalDiscussionUser.ICreate,
    },
  );
  typia.assert(validAdmin);

  TestValidator.equals(
    "valid admin account created successfully",
    validAdmin.status,
    "active",
  );
}
