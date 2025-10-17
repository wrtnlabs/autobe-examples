import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";

export async function test_api_registered_user_password_reset_confirm_token_expired(
  connection: api.IConnection,
) {
  /**
   * Purpose:
   *
   * - Verify that confirming a password reset with an expired (or otherwise
   *   invalid) token is rejected by the API and does not alter account state.
   *
   * Flow:
   *
   * 1. Create a new registered user via POST /auth/registeredUser/join
   * 2. Request password reset for that user's email
   * 3. Simulate an expired token (use a random token string) and attempt to
   *    confirm password reset
   * 4. In non-simulate mode expect an error; in simulate mode assert response
   *    shape because the simulator returns random values
   * 5. Assert the original join response contains an authorization token and that
   *    request-reset returned a generic success response
   *
   * Notes:
   *
   * - Direct DB assertions (e.g., checking
   *   econ_political_forum_password_resets.used) are not possible with the
   *   provided SDK functions, so those checks are described but omitted. The
   *   test relies on observable API behavior only.
   */

  // 1) Create a new registered user
  // Username length: 8 chars (within recommended 3-30 char range)
  const username = RandomGenerator.alphaNumeric(8);
  const email = typia.random<string & tags.Format<"email">>();
  const initialPassword = "InitPassw0rd!"; // meets password policy (>=10, mixed classes)

  const created: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username,
        email,
        password: initialPassword,
        display_name: RandomGenerator.name(),
      } satisfies IEconPoliticalForumRegisteredUser.IJoin,
    });
  typia.assert(created);
  typia.assert(created.token);

  // 2) Trigger password reset request
  const requestResp: IEconPoliticalForumRegisteredUser.IGenericSuccess =
    await api.functional.auth.registeredUser.password.request_reset.requestPasswordReset(
      connection,
      {
        body: {
          email,
        } satisfies IEconPoliticalForumRegisteredUser.IRequestPasswordReset,
      },
    );
  typia.assert(requestResp);

  // 3) Simulate expiry by crafting an explicit token that will be considered invalid/expired
  //    (We cannot mutate DB expires_at with available SDK functions.)
  const expiredToken = typia.random<string>();
  const newPassword = "NewPassw0rd!"; // meets password policy

  // 4) Attempt to confirm reset with the expired token
  if (connection.simulate === true) {
    // In simulation mode the SDK returns random success data; assert shape instead
    const resp =
      await api.functional.auth.registeredUser.password.confirm_reset.confirmPasswordReset(
        connection,
        {
          body: {
            token: expiredToken,
            new_password: newPassword,
          } satisfies IEconPoliticalForumRegisteredUser.IConfirmPasswordReset,
        },
      );
    typia.assert(resp);
  } else {
    // In real environment expect the API to reject expired/invalid tokens
    await TestValidator.error(
      "expired or invalid reset token should be rejected",
      async () => {
        await api.functional.auth.registeredUser.password.confirm_reset.confirmPasswordReset(
          connection,
          {
            body: {
              token: expiredToken,
              new_password: newPassword,
            } satisfies IEconPoliticalForumRegisteredUser.IConfirmPasswordReset,
          },
        );
      },
    );
  }

  // 5) Post-conditions observable via SDK:
  // - requestResp is a generic success acknowledgement (no account enumeration)
  TestValidator.predicate(
    "request-reset returned boolean success flag",
    typeof requestResp.success === "boolean",
  );

  // - original join response still contains an authorization token object
  typia.assert(created.token);
  TestValidator.predicate(
    "join returned non-empty access token",
    typeof created.token.access === "string" && created.token.access.length > 0,
  );

  // Note: DB-level assertions (password_hash unchanged, reset.used false,
  // sessions not invalidated) require direct DB access or admin SDK functions
  // not provided in the material. Those checks should be performed via direct
  // database queries in the test environment or via dedicated admin endpoints
  // when available. This test focuses on observable API outcomes only.
}
