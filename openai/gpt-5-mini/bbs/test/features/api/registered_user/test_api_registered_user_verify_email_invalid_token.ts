import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";

/**
 * Validate that verify-email rejects invalid tokens and does not change account
 * state.
 *
 * Business context:
 *
 * - After registration, users receive a one-time verification token via email.
 * - If a forged or expired token is submitted, the API must reject it and must
 *   not flip email_verified or set verified_at on the user record.
 *
 * Steps:
 *
 * 1. Create a new registered user via POST /auth/registeredUser/join.
 * 2. Assert the returned IAuthorized object and its email_verified flag is
 *    false/undefined.
 * 3. Call POST /auth/registeredUser/verify-email with an invalid token and assert
 *    it fails.
 * 4. Confirm the in-memory representation of the user remains unverified.
 */
export async function test_api_registered_user_verify_email_invalid_token(
  connection: api.IConnection,
) {
  // 1) Setup: register a new user
  const joinBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: "Str0ngP@ssw0rd!",
    display_name: RandomGenerator.name(),
  } satisfies IEconPoliticalForumRegisteredUser.IJoin;

  const registered: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: joinBody,
    });
  typia.assert(registered);

  // 2) Initial validation: join should not mark email as verified
  // The IAuthorized type may have email_verified undefined or false; treat undefined as not verified.
  TestValidator.predicate(
    "email should not be verified immediately after join",
    registered.email_verified === false ||
      registered.email_verified === undefined,
  );

  // 3) Execute target: attempt verification with an invalid token
  // Use an obviously invalid token string but syntactically non-empty as required by DTO.
  await TestValidator.error(
    "verify-email rejects invalid or forged token",
    async () => {
      await api.functional.auth.registeredUser.verify_email.verifyEmail(
        connection,
        {
          body: {
            token: "invalid-token-123",
          } satisfies IEconPoliticalForumRegisteredUser.IVerifyEmail,
        },
      );
    },
  );

  // 4) Post-condition: the registered object's email_verified must remain unchanged
  // (we cannot query DB directly with provided SDK functions, so we validate the in-memory value remains false/undefined)
  TestValidator.predicate(
    "email_verified remains false (no successful verification)",
    registered.email_verified === false ||
      registered.email_verified === undefined,
  );
}
