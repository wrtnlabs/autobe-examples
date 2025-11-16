import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test that verification tokens enforce single-use validation.
 *
 * This test validates the security mechanism that prevents invalid or consumed
 * tokens from being used:
 *
 * 1. Create administrator account with initial credentials
 * 2. Request email change with a new email address (generates a verification
 *    token)
 * 3. Attempt to confirm email change with an invalid token
 * 4. Verify that the confirmation fails, demonstrating token validation
 *    enforcement
 * 5. Verify that the administrator's email remains unchanged after failed attempt
 *
 * This demonstrates that the confirmation endpoint properly validates tokens,
 * protecting administrator accounts from unauthorized email changes via invalid
 * tokens.
 */
export async function test_api_administrator_email_change_confirm_token_reuse(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminUsername = RandomGenerator.alphabets(8);
  const adminName = RandomGenerator.name();

  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: adminUsername,
        name: adminName,
        href: "http://localhost:3000/admin/join",
        referrer: null,
        ip: null,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Request email change with a new email address
  const newEmail = typia.random<string & tags.Format<"email">>();

  const emailChangeRequest: ICommunityPlatformAdministrator.IEmailChangeRequestResponse =
    await api.functional.communityPlatform.administrator.auth.administrator.email_change.request.requestEmailChange(
      connection,
      {
        body: {
          new_email: newEmail,
        } satisfies ICommunityPlatformAdministrator.IEmailChangeRequest,
      },
    );
  typia.assert(emailChangeRequest);
  TestValidator.predicate(
    "verification token expiration should be set",
    emailChangeRequest.verification_token_expires_in > 0,
  );

  // Step 3: Attempt to confirm with an invalid token
  // This simulates attempting to use an invalid, expired, or already-consumed token
  const invalidToken = RandomGenerator.alphaNumeric(64);

  await TestValidator.error(
    "confirmation with invalid or consumed token should fail",
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

  // Step 4 & 5: Verify that the administrator's email has not changed
  TestValidator.equals(
    "administrator email should remain unchanged after failed token confirmation",
    admin.email,
    adminEmail,
  );
}
