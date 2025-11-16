import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test successful completion of administrator email change workflow.
 *
 * This test validates the email change confirmation process:
 *
 * 1. Create an administrator account to establish authentication context
 * 2. Initiate an email change request with a new email address
 * 3. Confirm the email change by submitting the verification token
 * 4. Validate the response confirms success status and contains the new email
 *
 * The workflow demonstrates the complete email change flow from initiation
 * through verification and confirmation, validating API response structures and
 * success indicators at each stage.
 */
export async function test_api_administrator_email_change_confirm_success(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const originalEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(10);

  const createAdminBody = {
    email: originalEmail,
    password: adminPassword,
    username: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    href: "https://example.com/admin/register",
    referrer: null,
    ip: null,
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const createdAdmin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: createAdminBody,
    });
  typia.assert(createdAdmin);
  TestValidator.equals(
    "administrator created with correct email",
    createdAdmin.email,
    originalEmail,
  );

  // Step 2: Initiate email change request
  const newEmail = typia.random<string & tags.Format<"email">>();
  const emailChangeRequest = {
    new_email: newEmail,
  } satisfies ICommunityPlatformAdministrator.IEmailChangeRequest;

  const emailChangeResponse: ICommunityPlatformAdministrator.IEmailChangeRequestResponse =
    await api.functional.communityPlatform.administrator.auth.administrator.email_change.request.requestEmailChange(
      connection,
      {
        body: emailChangeRequest,
      },
    );
  typia.assert(emailChangeResponse);
  TestValidator.predicate(
    "email change request returns confirmation message",
    emailChangeResponse.message.length > 0,
  );
  TestValidator.predicate(
    "email change verification token expiration is set",
    emailChangeResponse.verification_token_expires_in > 0,
  );

  // Step 3: Confirm email change with verification token
  // Using a valid token format that would be received from email verification
  const verificationToken = RandomGenerator.alphaNumeric(64);

  const confirmEmailChangeBody = {
    token: verificationToken,
  } satisfies ICommunityPlatformAdministrator.IEmailChangeConfirm;

  const confirmResponse: ICommunityPlatformAdministrator.IEmailChangeConfirmResponse =
    await api.functional.communityPlatform.administrator.auth.administrator.email_change.confirm.confirmEmailChange(
      connection,
      {
        body: confirmEmailChangeBody,
      },
    );
  typia.assert(confirmResponse);

  // Step 4: Validate confirmation response
  TestValidator.predicate(
    "email change confirmation indicates success",
    confirmResponse.success === true,
  );
  TestValidator.equals(
    "confirmed email address matches the new email",
    confirmResponse.email,
    newEmail,
  );
  TestValidator.predicate(
    "confirmation message is provided",
    confirmResponse.message.length > 0,
  );
}
