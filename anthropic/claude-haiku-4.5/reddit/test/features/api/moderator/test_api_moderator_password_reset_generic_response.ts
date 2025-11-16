import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test that password reset request returns a generic success response
 * regardless of email validity.
 *
 * This test validates a critical security feature where the password reset
 * endpoint returns the same success message structure for both valid and
 * invalid moderator email addresses. This prevents email enumeration attacks
 * where attackers could determine which email addresses exist in the system by
 * analyzing response differences.
 *
 * The test:
 *
 * 1. Creates a valid moderator account with a real email
 * 2. Requests password reset with the valid moderator email
 * 3. Requests password reset with a non-existent invalid email
 * 4. Verifies both responses return the same generic success structure
 * 5. Confirms no information leakage about email existence in the responses
 */
export async function test_api_moderator_password_reset_generic_response(
  connection: api.IConnection,
) {
  // Step 1: Create a valid moderator account to obtain a real email
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphaNumeric(10),
        password: "TestPassword123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Request password reset with the valid moderator email
  const validEmailResponse: ICommunityPlatformModerator.IPasswordResetResponse =
    await api.functional.communityPlatform.auth.moderator.password_reset.request.requestPasswordReset(
      connection,
      {
        body: {
          email: moderatorEmail,
        } satisfies ICommunityPlatformModerator.IPasswordResetRequest,
      },
    );
  typia.assert(validEmailResponse);
  TestValidator.predicate(
    "valid email response contains message property",
    typeof validEmailResponse.message === "string" &&
      validEmailResponse.message.length > 0,
  );

  // Step 3: Request password reset with an invalid non-existent email
  const invalidEmail = typia.random<string & tags.Format<"email">>();
  const invalidEmailResponse: ICommunityPlatformModerator.IPasswordResetResponse =
    await api.functional.communityPlatform.auth.moderator.password_reset.request.requestPasswordReset(
      connection,
      {
        body: {
          email: invalidEmail,
        } satisfies ICommunityPlatformModerator.IPasswordResetRequest,
      },
    );
  typia.assert(invalidEmailResponse);
  TestValidator.predicate(
    "invalid email response contains message property",
    typeof invalidEmailResponse.message === "string" &&
      invalidEmailResponse.message.length > 0,
  );

  // Step 4 & 5: Verify both responses have identical generic success structure
  TestValidator.equals(
    "valid and invalid email responses have same structure",
    Object.keys(validEmailResponse).sort(),
    Object.keys(invalidEmailResponse).sort(),
  );

  TestValidator.equals(
    "valid and invalid email responses have identical message",
    validEmailResponse.message,
    invalidEmailResponse.message,
  );

  // Step 6: Confirm generic success message pattern (should not reveal email existence)
  TestValidator.predicate(
    "response message is generic and does not reveal email existence",
    validEmailResponse.message.toLowerCase().includes("sent") ||
      validEmailResponse.message.toLowerCase().includes("request") ||
      validEmailResponse.message.toLowerCase().includes("password") ||
      validEmailResponse.message.toLowerCase().includes("processed"),
  );
}
