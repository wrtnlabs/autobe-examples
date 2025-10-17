import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumAdministrator";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";

export async function test_api_administrator_password_reset_confirm_invalid_or_expired_token(
  connection: api.IConnection,
) {
  /**
   * Purpose
   *
   * Validate that POST /auth/administrator/password/reset/confirm rejects
   * invalid or expired tokens and does not produce a successful password
   * reset.
   *
   * Notes:
   *
   * - Given the provided SDK, we cannot inspect database rows directly. The test
   *   therefore asserts the public contract: confirmation attempts with
   *   invalid/expired tokens must result in failure semantics (success=false)
   *   or an HTTP client error.
   */

  // 1) Create an administrator account
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12); // >= 10 chars
  const admin: IEconPoliticalForumAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphaNumeric(8),
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumAdministrator.IJoin,
    });
  typia.assert(admin);

  // 2) Trigger a password reset request (acknowledgement only)
  const resetRequest: IEconPoliticalForumAdministrator.IResetRequestResponse =
    await api.functional.auth.administrator.password.reset.requestPasswordReset(
      connection,
      {
        body: {
          email: adminEmail,
        } satisfies IEconPoliticalForumAdministrator.IRequestPasswordReset,
      },
    );
  typia.assert(resetRequest);
  TestValidator.predicate(
    "password reset request accepted (acknowledgement)",
    resetRequest.success === true,
  );

  // 3) Case A: invalid token
  const invalidToken = RandomGenerator.alphaNumeric(40);
  const invalidAttempt: IEconPoliticalForumAdministrator.IResetConfirmResponse =
    await api.functional.auth.administrator.password.reset.confirm.confirmPasswordReset(
      connection,
      {
        body: {
          token: invalidToken,
          new_password: RandomGenerator.alphaNumeric(12),
        } satisfies IEconPoliticalForumAdministrator.IConfirmPasswordReset,
      },
    );
  typia.assert(invalidAttempt);
  // The contract: failure (success === false) and non-sensitive message
  TestValidator.predicate(
    "invalid token should not reset password",
    invalidAttempt.success === false,
  );
  TestValidator.predicate(
    "invalid token returns a non-empty message",
    typeof invalidAttempt.message === "string" &&
      invalidAttempt.message.length > 0,
  );

  // 4) Case B: expired-like token (cannot mark DB here; simulate by another
  // token value that the server must treat as invalid/expired)
  const expiredLikeToken = RandomGenerator.alphaNumeric(40);
  const expiredAttempt: IEconPoliticalForumAdministrator.IResetConfirmResponse =
    await api.functional.auth.administrator.password.reset.confirm.confirmPasswordReset(
      connection,
      {
        body: {
          token: expiredLikeToken,
          new_password: RandomGenerator.alphaNumeric(12),
        } satisfies IEconPoliticalForumAdministrator.IConfirmPasswordReset,
      },
    );
  typia.assert(expiredAttempt);
  TestValidator.predicate(
    "expired (or expired-like) token should not reset password",
    expiredAttempt.success === false,
  );
  TestValidator.predicate(
    "expired token returns a non-empty message",
    typeof expiredAttempt.message === "string" &&
      expiredAttempt.message.length > 0,
  );

  // 5) Notes and limitations: DB-level assertions (password_hash unchanged,
  // reset record used=false, sessions unchanged) require privileged test
  // helpers or direct DB access and are NOT performed here due to SDK
  // limitations. Recommend adding a test-only admin/read endpoint or a test
  // harness that can inspect password_resets and sessions for deeper
  // verification.
}
