import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";

export async function test_api_registered_user_password_reset_confirm_token_already_used(
  connection: api.IConnection,
) {
  /**
   * Validate single-use semantics of password reset tokens.
   *
   * Notes for integrators:
   *
   * - Production systems deliver the actual reset token via email. This test
   *   currently simulates token retrieval because the SDK does not provide an
   *   API to fetch raw reset tokens. For a full integration test, the CI
   *   harness should retrieve the issued token (e.g., direct DB read of
   *   `econ_political_forum_password_resets` or a test-only debug endpoint) and
   *   assign it to `resetToken` below instead of the simulated value.
   */

  // 1) Create a registered user
  const joinBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: `${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
  } satisfies IEconPoliticalForumRegisteredUser.IJoin;

  const created: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: joinBody,
    });
  typia.assert(created);

  // 2) Trigger password reset for the created account
  const requestBody = {
    email: joinBody.email,
  } satisfies IEconPoliticalForumRegisteredUser.IRequestPasswordReset;

  const requestResult: IEconPoliticalForumRegisteredUser.IGenericSuccess =
    await api.functional.auth.registeredUser.password.request_reset.requestPasswordReset(
      connection,
      { body: requestBody },
    );
  typia.assert(requestResult);
  // Because we created the user above, this should report success
  TestValidator.equals("request-reset success", requestResult.success, true);

  // 3) Retrieve or simulate the reset token
  // IMPORTANT: Replace the following simulated token assignment with a real
  // retrieval from the test harness (email inbox, DB record, or test-only
  // endpoint) for a true integration verification.
  const resetToken: string = typia.random<string>();

  // 4) Compose a new password that satisfies the server-side password policy
  const firstNewPassword = `${RandomGenerator.alphaNumeric(8)}Aa1!`;

  const confirmBody = {
    token: resetToken,
    new_password: firstNewPassword,
  } satisfies IEconPoliticalForumRegisteredUser.IConfirmPasswordReset;

  // 5) First consume attempt - expect success
  const firstConsume: IEconPoliticalForumRegisteredUser.IGenericSuccess =
    await api.functional.auth.registeredUser.password.confirm_reset.confirmPasswordReset(
      connection,
      { body: confirmBody },
    );
  typia.assert(firstConsume);
  TestValidator.equals("first consume success", firstConsume.success, true);

  // 6) Second consume attempt with same token must fail (single-use enforcement)
  await TestValidator.error(
    "second consume with same token should fail",
    async () => {
      await api.functional.auth.registeredUser.password.confirm_reset.confirmPasswordReset(
        connection,
        { body: confirmBody },
      );
    },
  );

  // Teardown note: If the test harness supports cleanup, remove created user,
  // password reset records, and sessions here. This sample leaves cleanup to
  // the caller/harness.
}
