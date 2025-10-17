import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";

/**
 * End-to-end: Registered user email verification (production-ready variant)
 *
 * Purpose and scope:
 *
 * - Validates the happy-path API flow for email verification using only the SDK
 *   functions available in the provided materials.
 * - Designed to run in two modes:
 *
 *   1. Real CI/test harness: CI captures outbound verification emails and injects
 *        the single-use verification token into the environment variable
 *        TEST_VERIFICATION_TOKEN (recommended). Alternatively, the test harness
 *        can expose a secure test-only API to fetch the token.
 *   2. Simulated SDK mode: when connection.simulate === true, the test uses a
 *        simulated token via typia.random to exercise the SDK simulate path.
 *
 * Notes for implementers / CI integrators:
 *
 * - To assert database state (email_verified=true and verified_at), extend the
 *   test harness to query the DB or provide a dedicated admin/read endpoint.
 * - To test token single-use semantics, ensure the harness provides a
 *   deterministic token or an API that returns the newly-created token. Then
 *   add an extra step attempting a second verification and asserting failure.
 */
export async function test_api_registered_user_verify_email_success(
  connection: api.IConnection,
) {
  // 1) Build unique test user data
  const email = typia.random<string & tags.Format<"email">>();
  const username = `user_${RandomGenerator.alphaNumeric(8)}`;
  const password = `Px${RandomGenerator.alphaNumeric(10)}!`;

  // 2) Register the user (join)
  const joinBody = {
    username,
    email,
    password,
    display_name: RandomGenerator.name(),
  } satisfies IEconPoliticalForumRegisteredUser.IJoin;

  const authorized: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);
  TestValidator.predicate(
    "join returned authorization token",
    !!(authorized && authorized.token && authorized.token.access),
  );

  // 3) Request a resend of verification token
  const resendBody = {
    email,
  } satisfies IEconPoliticalForumRegisteredUser.IResendVerification;
  const resend: IEconPoliticalForumRegisteredUser.IGenericSuccess =
    await api.functional.auth.registeredUser.verify_email.resend.resendVerification(
      connection,
      { body: resendBody },
    );
  typia.assert(resend);
  TestValidator.equals("resend acknowledged success", resend.success, true);

  // 4) Obtain the verification token (environment / test harness required)
  // Priority order:
  //  - process.env.TEST_VERIFICATION_TOKEN (CI/test harness should set)
  //  - connection.simulate === true -> typia.random() fallback for simulate runs
  //  - otherwise: fail fast with actionable message
  let verificationToken: string | undefined;

  if (
    typeof process !== "undefined" &&
    typeof process.env === "object" &&
    process.env.TEST_VERIFICATION_TOKEN
  ) {
    verificationToken = process.env.TEST_VERIFICATION_TOKEN;
  } else if ((connection as any)?.simulate === true) {
    // Simulation fallback only - not valid for verifying real accounts
    verificationToken = typia.random<string & tags.MinLength<1>>();
  }

  if (!verificationToken) {
    // Fail fast with instructions for CI/test-harness authors
    throw new Error(
      "Verification token not available. To run this test in a real environment, capture the outbound verification email in your test harness and set TEST_VERIFICATION_TOKEN with the single-use token. Alternatively, provide a test-only API to read the token from the mail queue or DB.",
    );
  }

  // 5) Consume verification token
  const verifyBody = {
    token: verificationToken,
  } satisfies IEconPoliticalForumRegisteredUser.IVerifyEmail;
  const verify: IEconPoliticalForumRegisteredUser.IGenericSuccess =
    await api.functional.auth.registeredUser.verify_email.verifyEmail(
      connection,
      {
        body: verifyBody,
      },
    );
  typia.assert(verify);
  TestValidator.equals(
    "verify-email acknowledged success",
    verify.success,
    true,
  );

  // 6) Guidance for further validation (not implemented due to SDK limits):
  // - If your test harness can query the DB, assert that the user record has
  //   email_verified === true and verified_at is a recent date-time.
  // - To validate token single-use: attempt a second verify with the same
  //   token and assert that verify-email returns an error (wrap in
  //   await TestValidator.error(...)). Implement that when deterministic
  //   token retrieval is available.
}
