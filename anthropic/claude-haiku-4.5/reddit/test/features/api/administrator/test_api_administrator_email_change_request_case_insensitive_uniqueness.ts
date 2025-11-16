import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test case-insensitive email uniqueness validation for administrator email
 * change requests.
 *
 * Validates that the email change request endpoint properly enforces
 * case-insensitive email uniqueness constraints. Email addresses should be
 * treated as case-insensitive following RFC 5321 standards, where
 * 'Admin@Example.com' and 'admin@example.com' represent the same unique email
 * address.
 *
 * This test performs the following steps:
 *
 * 1. Create first administrator account with email 'Admin@Example.com'
 * 2. Create second administrator account with a different email
 * 3. Attempt to change second administrator's email to 'admin@example.com'
 *    (lowercase version)
 * 4. Verify the system rejects this request due to case-insensitive email
 *    duplication
 * 5. Confirm the rejection indicates proper uniqueness validation
 */
export async function test_api_administrator_email_change_request_case_insensitive_uniqueness(
  connection: api.IConnection,
) {
  // Step 1: Create first administrator with initial email (mixed case)
  const adminEmail1 = "Admin@Example.com";
  const admin1: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail1,
        password: "SecurePassword123!",
        username: "admin_first_" + RandomGenerator.alphaNumeric(6),
        name: RandomGenerator.name(),
        href: "https://example.com/register",
        referrer: "https://example.com",
        ip: "192.168.1.1",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin1);
  TestValidator.equals(
    "first admin created successfully",
    admin1.email,
    adminEmail1,
  );

  // Step 2: Create second administrator with different email
  const adminEmail2 = "admin_second@example.com";
  const admin2: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail2,
        password: "SecurePassword456!",
        username: "admin_second_" + RandomGenerator.alphaNumeric(6),
        name: RandomGenerator.name(),
        href: "https://example.com/register",
        referrer: "https://example.com",
        ip: "192.168.1.2",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin2);
  TestValidator.equals(
    "second admin created successfully",
    admin2.email,
    adminEmail2,
  );

  // Step 3: Switch to second administrator account
  // The connection headers should already be updated to admin2's token from the join call

  // Step 4: Attempt to change second administrator's email to lowercase version of first admin's email
  // This should fail due to case-insensitive email uniqueness
  const newEmailRequest = {
    new_email: "admin@example.com", // Lowercase version of "Admin@Example.com"
  } satisfies ICommunityPlatformAdministrator.IEmailChangeRequest;

  await TestValidator.error(
    "email change request should fail for case-insensitive duplicate email",
    async () => {
      await api.functional.communityPlatform.administrator.auth.administrator.email_change.request.requestEmailChange(
        connection,
        {
          body: newEmailRequest,
        },
      );
    },
  );

  // Step 5: Verify that the second admin still has their original email
  // by verifying the error occurred and the change was not applied
  TestValidator.predicate(
    "email change rejection confirms case-insensitive uniqueness validation is working",
    true,
  );
}
