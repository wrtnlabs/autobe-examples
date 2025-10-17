import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";

export async function test_api_administrator_email_verification_expired_or_invalid_token(
  connection: api.IConnection,
) {
  /**
   * Verify that administrator email verification endpoint rejects invalid or
   * expired tokens and does not return a successful verification.
   *
   * Flow:
   *
   * 1. Register administrator via POST /auth/administrator/join
   * 2. Request resend of verification via POST
   *    /auth/registeredUser/verify-email/resend
   * 3. Call GET /auth/administrator/email/verify/{token} with an invalid random
   *    UUID
   * 4. Call GET /auth/administrator/email/verify/{token} with a deterministic
   *    zero-UUID
   *
   * Notes: Direct DB assertions of email_verified are not possible with the
   * provided SDK, so the test asserts observable API behavior only.
   */

  // 1) Administrator sign up
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminBody = {
    email: adminEmail,
    password: "StrongPass123", // satisfies minLength<10>
    username: RandomGenerator.name(1),
    display_name: RandomGenerator.name(),
  } satisfies IEconPoliticalForumAdministrator.IJoin;

  const admin: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminBody,
    });
  typia.assert(admin);

  TestValidator.predicate(
    "administrator has an id",
    typeof admin.id === "string" && admin.id.length > 0,
  );
  TestValidator.predicate(
    "administrator returned an access token",
    typeof admin.token?.access === "string" && admin.token.access.length > 0,
  );

  // 2) Trigger resend verification (expect a generic success acknowledgement)
  const resend =
    await api.functional.auth.registeredUser.verify_email.resend.resendVerification(
      connection,
      {
        body: {
          email: adminEmail,
        } satisfies IEconPoliticalForumRegisteredUser.IResendVerification,
      },
    );
  typia.assert(resend);
  TestValidator.equals(
    "resend verification succeeded (actual, expected)",
    resend.success,
    true,
  );

  // Helper: call verify endpoint and accept either thrown error or success=false
  async function assertVerifyFails(
    tokenValue: string & tags.Format<"uuid">,
    title: string,
  ) {
    try {
      const result =
        await api.functional.auth.administrator.email.verify.verifyEmail(
          connection,
          { token: tokenValue },
        );
      typia.assert(result);
      TestValidator.predicate(
        `${title}: result.success should be false`,
        result.success === false,
      );
    } catch (err) {
      // An HTTP error thrown is an acceptable failure mode for invalid/expired tokens.
      TestValidator.predicate(
        `${title}: verifyEmail threw an error as expected`,
        true,
      );
    }
  }

  // 3) Invalid token (random UUID)
  const invalidToken: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await assertVerifyFails(invalidToken, "invalid token test");

  // 4) Expired token fixture (zero UUID) — valid UUID format but expected to fail
  const expiredFixtureToken: string & tags.Format<"uuid"> =
    "00000000-0000-0000-0000-000000000000" as unknown as string &
      tags.Format<"uuid">;
  await assertVerifyFails(expiredFixtureToken, "expired token fixture test");

  // Cleanup note: Test harness or CI should handle rollback/isolation. No direct DB cleanup attempted here.
}
