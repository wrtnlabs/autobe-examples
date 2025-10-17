import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussVerifiedExpert } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpert";
import type { IEconDiscussVerifiedExpertJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpertJoin";
import type { IEconDiscussVerifiedExpertPassword } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpertPassword";
import type { IEconDiscussVerifiedExpertPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpertPasswordReset";

export async function test_api_verified_expert_password_reset_token_reuse_denied(
  connection: api.IConnection,
) {
  /**
   * Validate verified expert password reset lifecycle without relying on a mail
   * sink.
   *
   * Steps:
   *
   * 1. Create a verified expert via join.
   * 2. Initiate password reset (forgot) with the user's email (twice to assert
   *    idempotency).
   * 3. Attempt password reset with a non-issued token (expect error).
   * 4. Attempt password reset again with the same token (expect error again).
   */

  // 1) Create verified expert account
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const joinBody = {
    email,
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(1),
    timezone: "Asia/Seoul",
    locale: "en-US",
    avatar_uri: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEconDiscussVerifiedExpertJoin.ICreate;

  const authorized: IEconDiscussVerifiedExpert.IAuthorized =
    await api.functional.auth.verifiedExpert.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);
  TestValidator.equals(
    "joined role must be verifiedExpert",
    authorized.role,
    "verifiedExpert",
  );

  // 2) Request password reset (forgot) - idempotent behavior expected
  const forgotBody = {
    email,
    locale: "en-US",
  } satisfies IEconDiscussVerifiedExpertPassword.IRequest;
  await api.functional.auth.verifiedExpert.password.forgot.requestPasswordReset(
    connection,
    { body: forgotBody },
  );
  // call again to ensure idempotency (no error leakage or enumeration)
  await api.functional.auth.verifiedExpert.password.forgot.requestPasswordReset(
    connection,
    { body: forgotBody },
  );

  // 3) Attempt reset with a non-issued token - expect error
  const dummyToken: string = RandomGenerator.alphaNumeric(48);
  const newPassword1: string = RandomGenerator.alphaNumeric(16);
  await TestValidator.error(
    "reset must reject a non-issued token",
    async () => {
      await api.functional.auth.verifiedExpert.password.reset.resetPassword(
        connection,
        {
          body: {
            token: dummyToken,
            new_password: newPassword1,
          } satisfies IEconDiscussVerifiedExpertPasswordReset.ICreate,
        },
      );
    },
  );

  // 4) Attempt reset again with the same token - expect error again
  const newPassword2: string = RandomGenerator.alphaNumeric(16);
  await TestValidator.error(
    "reusing the same (still non-issued/invalid) token must be rejected",
    async () => {
      await api.functional.auth.verifiedExpert.password.reset.resetPassword(
        connection,
        {
          body: {
            token: dummyToken,
            new_password: newPassword2,
          } satisfies IEconDiscussVerifiedExpertPasswordReset.ICreate,
        },
      );
    },
  );
}
