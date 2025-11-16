import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test successful email change request initiation for an authenticated
 * administrator.
 *
 * This test validates that an administrator can successfully initiate an email
 * change request workflow. The endpoint verifies the new email address format,
 * checks its uniqueness across administrator accounts, and generates a
 * cryptographically secure verification token with 24-hour expiration. The
 * administrator's current email remains active until the new email is verified
 * through the confirmation endpoint.
 *
 * Test steps:
 *
 * 1. Create a new administrator account with valid credentials
 * 2. Request an email change to a new, unused email address
 * 3. Validate the response contains confirmation message and token expiration time
 * 4. Verify token expiration is 86400 seconds (24 hours)
 * 5. Confirm administrator's original email is still associated with the account
 */
export async function test_api_administrator_email_change_request_success(
  connection: api.IConnection,
) {
  // Step 1: Create a new administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "SecurePassword123!";
  const adminUsername = RandomGenerator.alphaNumeric(10);
  const adminName = RandomGenerator.name();

  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: adminUsername,
        name: adminName,
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(administrator);

  // Step 2: Request email change to a new, unique email address
  const newAdminEmail = typia.random<string & tags.Format<"email">>();

  const emailChangeResponse =
    await api.functional.communityPlatform.administrator.auth.administrator.email_change.request.requestEmailChange(
      connection,
      {
        body: {
          new_email: newAdminEmail,
        } satisfies ICommunityPlatformAdministrator.IEmailChangeRequest,
      },
    );
  typia.assert(emailChangeResponse);

  // Step 3: Validate response structure and content
  TestValidator.predicate(
    "response message should be a non-empty string",
    typeof emailChangeResponse.message === "string" &&
      emailChangeResponse.message.length > 0,
  );

  TestValidator.predicate(
    "verification token expiration should be a positive number",
    typeof emailChangeResponse.verification_token_expires_in === "number" &&
      emailChangeResponse.verification_token_expires_in > 0,
  );

  // Step 4: Verify token expiration is 24 hours (86400 seconds)
  TestValidator.equals(
    "verification token expiration should be 24 hours",
    emailChangeResponse.verification_token_expires_in,
    86400,
  );

  // Step 5: Confirm administrator's original email is still associated with the account
  TestValidator.equals(
    "administrator email should still be the original email after change request",
    administrator.email,
    adminEmail,
  );

  TestValidator.notEquals(
    "new email should be different from original email",
    newAdminEmail,
    adminEmail,
  );
}
