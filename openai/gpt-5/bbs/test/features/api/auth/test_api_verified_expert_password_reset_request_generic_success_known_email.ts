import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussVerifiedExpert } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpert";
import type { IEconDiscussVerifiedExpertJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpertJoin";
import type { IEconDiscussVerifiedExpertPassword } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVerifiedExpertPassword";

/**
 * Generic success on password-reset request for known verifiedExpert email.
 *
 * Purpose: Ensure that requesting a password reset with a real, existing
 * verifiedExpert account returns a generic success response (no user
 * enumeration) and that repeating the request also succeeds generically.
 * Additionally, verify that requesting with a random unknown email is handled
 * generically as well.
 *
 * Steps:
 *
 * 1. Register a new verifiedExpert via join to obtain a real email.
 * 2. Request password reset with the known email.
 * 3. Immediately request again with the same email to confirm generic/idempotent
 *    behavior.
 * 4. Request with a different random email (unknown) and expect generic success.
 *
 * Notes:
 *
 * - The forgot endpoint returns void; only verify that no error is thrown.
 * - Do not attempt to intercept out-of-band tokens. That flow is validated in
 *   dedicated reset-confirmation tests.
 */
export async function test_api_verified_expert_password_reset_request_generic_success_known_email(
  connection: api.IConnection,
) {
  // 1) Register a verifiedExpert to get a concrete email
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    display_name: RandomGenerator.name(1),
    timezone: "Asia/Seoul",
    locale: "en-US",
  } satisfies IEconDiscussVerifiedExpertJoin.ICreate;

  const authorized = await api.functional.auth.verifiedExpert.join(connection, {
    body: joinBody,
  });
  typia.assert(authorized);
  TestValidator.equals(
    "session role must be fixed to verifiedExpert",
    authorized.role,
    "verifiedExpert",
  );

  // 2) Request password reset with the known email
  const knownEmailRequest = {
    email: joinBody.email,
    locale: "en-US",
  } satisfies IEconDiscussVerifiedExpertPassword.IRequest;

  await api.functional.auth.verifiedExpert.password.forgot.requestPasswordReset(
    connection,
    { body: knownEmailRequest },
  );
  TestValidator.predicate(
    "first reset request for known email completes without error",
    true,
  );

  // 3) Repeat quickly with the same email - should still be generic success
  await api.functional.auth.verifiedExpert.password.forgot.requestPasswordReset(
    connection,
    { body: knownEmailRequest },
  );
  TestValidator.predicate(
    "second reset request for the same email completes without error",
    true,
  );

  // 4) Request with an unknown random email - should also be generic success
  let unknownEmail = typia.random<string & tags.Format<"email">>();
  if (unknownEmail.toLowerCase() === joinBody.email.toLowerCase())
    unknownEmail = `${RandomGenerator.alphabets(8)}@example.com`;

  const unknownEmailRequest = {
    email: unknownEmail,
    locale: "en-US",
  } satisfies IEconDiscussVerifiedExpertPassword.IRequest;

  await api.functional.auth.verifiedExpert.password.forgot.requestPasswordReset(
    connection,
    { body: unknownEmailRequest },
  );
  TestValidator.predicate(
    "reset request for unknown email completes without error (no enumeration)",
    true,
  );
}
