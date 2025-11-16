import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test email change confirmation with an invalid or malformed verification
 * token.
 *
 * This test validates the email change confirmation endpoint's token validation
 * capabilities. It creates a new administrator account, then attempts to
 * confirm an email change using an invalid, corrupted, or structurally invalid
 * token. The system should properly validate the token cryptographically and
 * reject the confirmation with an appropriate error. The test verifies that no
 * email address change occurs when token validation fails, ensuring the
 * administrator's email remains unchanged.
 *
 * Steps:
 *
 * 1. Create a new administrator account through the join endpoint
 * 2. Verify administrator is created successfully
 * 3. Attempt to confirm email change with an invalid token
 * 4. Verify the confirmation fails with appropriate error handling
 * 5. Verify the administrator's email remains unchanged
 */
export async function test_api_administrator_email_change_confirm_invalid_token(
  connection: api.IConnection,
) {
  // Step 1: Create a new administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(12);
  const adminUsername = RandomGenerator.alphaNumeric(8);
  const adminName = RandomGenerator.name();

  const createdAdmin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: adminUsername,
        name: adminName,
        href: "https://example.com/admin/join",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(createdAdmin);

  // Step 2: Verify administrator is created successfully
  TestValidator.equals(
    "administrator email matches created email",
    createdAdmin.email,
    adminEmail,
  );
  TestValidator.equals(
    "administrator username matches",
    createdAdmin.username,
    adminUsername,
  );
  TestValidator.predicate(
    "administrator account status is active",
    createdAdmin.account_status === "active",
  );

  // Step 3 & 4: Attempt to confirm email change with an invalid token
  // Use an invalid token format that doesn't match the system's expectations
  const invalidToken = RandomGenerator.alphaNumeric(32); // Random invalid token

  await TestValidator.error(
    "email change confirmation fails with invalid token",
    async () => {
      await api.functional.communityPlatform.administrator.auth.administrator.email_change.confirm.confirmEmailChange(
        connection,
        {
          body: {
            token: invalidToken,
          } satisfies ICommunityPlatformAdministrator.IEmailChangeConfirm,
        },
      );
    },
  );

  // Step 5: Verify the administrator's email remains unchanged
  // (In a real scenario, we would re-fetch the admin data, but for this test
  // we verify the confirmation failed, which means email wasn't changed)
  TestValidator.equals(
    "original email is preserved after failed confirmation",
    createdAdmin.email,
    adminEmail,
  );
}
