import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test the successful initiation of email verification for a platform
 * administrator.
 *
 * This test validates that when an administrator with valid credentials
 * requests email verification, the system successfully generates a verification
 * token and sends it to their registered email address. The response includes
 * confirmation message, the email address where verification was sent, and
 * token expiration time in hours.
 *
 * **Test Steps:**
 *
 * 1. Create a new administrator account with valid credentials
 * 2. Request email verification for the created administrator
 * 3. Validate the response contains confirmation message and email details
 * 4. Verify response structure matches IEmailVerifySendResponse type
 */
export async function test_api_administrator_email_verification_send_success(
  connection: api.IConnection,
) {
  // Step 1: Create a new administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();
  const adminUsername = RandomGenerator.alphabets(8); // Ensure meets MinLength<3> and MaxLength<50>
  const adminName = RandomGenerator.name();
  const adminHref = typia.random<string & tags.Format<"uri">>();
  const adminReferrer = RandomGenerator.paragraph({ sentences: 1 });
  const adminIp = "192.168.1.100";

  const createdAdmin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: adminUsername,
        name: adminName,
        href: adminHref,
        referrer: adminReferrer,
        ip: adminIp,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(createdAdmin);
  TestValidator.predicate(
    "administrator created successfully",
    createdAdmin.id !== null && createdAdmin.id !== undefined,
  );

  // Step 2: Request email verification for the created administrator
  const emailVerifyHref = adminHref;
  const emailVerifyReferrer = RandomGenerator.paragraph({ sentences: 1 });
  const emailVerifyIp = "192.168.1.100";

  const emailVerifyResponse: ICommunityPlatformAdministrator.IEmailVerifySendResponse =
    await api.functional.communityPlatform.administrator.auth.administrator.email_verify.send.sendEmailVerification(
      connection,
      {
        body: {
          email: createdAdmin.email,
          href: emailVerifyHref,
          referrer: emailVerifyReferrer,
          ip: emailVerifyIp,
        } satisfies ICommunityPlatformAdministrator.IEmailVerifySendRequest,
      },
    );
  typia.assert(emailVerifyResponse);

  // Step 3: Validate response contains confirmation message and email details
  TestValidator.predicate(
    "confirmation message is provided",
    emailVerifyResponse.message.length > 0,
  );
  TestValidator.equals(
    "email sent to matches administrator email",
    emailVerifyResponse.email_sent_to,
    createdAdmin.email,
  );
  TestValidator.predicate(
    "token expiration time is positive hours",
    emailVerifyResponse.expires_in_hours > 0,
  );
}
