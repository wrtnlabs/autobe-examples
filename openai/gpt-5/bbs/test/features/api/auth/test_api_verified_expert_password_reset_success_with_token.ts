import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussVerifiedExpert } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpert";
import type { IEconDiscussVerifiedExpertJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpertJoin";
import type { IEconDiscussVerifiedExpertPassword } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpertPassword";
import type { IEconDiscussVerifiedExpertPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpertPasswordReset";

/**
 * Verified Expert password reset success using a valid token.
 *
 * Business goal: ensure a newly joined Verified Expert can initiate a password
 * reset via the "forgot" flow and successfully complete the reset by submitting
 * a token with a strong new password.
 *
 * Steps:
 *
 * 1. Join as a new Verified Expert and capture the email.
 * 2. Request a password reset (forgot) using the email.
 * 3. Simulate captured out-of-band token and call reset with a strong password.
 * 4. Validate response structures and core business flags.
 *
 * Notes:
 *
 * - Token reuse/consumption and login validation are covered in separate
 *   scenarios per security guidance; this scenario focuses on the happy path.
 */
export async function test_api_verified_expert_password_reset_success_with_token(
  connection: api.IConnection,
) {
  // 1) Join as a new Verified Expert
  const email = typia.random<string & tags.Format<"email">>();
  const joinBody = {
    email,
    password: `Pwd${RandomGenerator.alphaNumeric(12)}`,
    display_name: RandomGenerator.name(2),
    timezone: "Asia/Seoul",
    locale: "en-US",
    avatar_uri: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEconDiscussVerifiedExpertJoin.ICreate;

  const expert = await api.functional.auth.verifiedExpert.join(connection, {
    body: joinBody,
  });
  typia.assert(expert);
  TestValidator.equals(
    "joined expert role must be verifiedExpert",
    expert.role,
    "verifiedExpert",
  );

  // 2) Request a password reset token (out-of-band delivery)
  const forgotBody = {
    email,
    locale: "en-US",
  } satisfies IEconDiscussVerifiedExpertPassword.IRequest;
  await api.functional.auth.verifiedExpert.password.forgot.requestPasswordReset(
    connection,
    { body: forgotBody },
  );

  // 3) Simulate captured token and perform reset with a strong new password
  const resetToken = `reset-${RandomGenerator.alphaNumeric(48)}`;
  const newPassword = `New${RandomGenerator.alphaNumeric(12)}`; // length >= 8
  const resetBody = {
    token: resetToken,
    new_password: newPassword,
  } satisfies IEconDiscussVerifiedExpertPasswordReset.ICreate;

  const result =
    await api.functional.auth.verifiedExpert.password.reset.resetPassword(
      connection,
      { body: resetBody },
    );
  typia.assert(result);

  // 4) Business validations
  TestValidator.predicate(
    "password reset should indicate success",
    result.success === true,
  );
}
