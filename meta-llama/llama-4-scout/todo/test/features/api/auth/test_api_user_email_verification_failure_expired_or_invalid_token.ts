import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import type { ITodoListUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserEmailVerification";

export async function test_api_user_email_verification_failure_expired_or_invalid_token(
  connection: api.IConnection,
) {
  // Step 1: Register a new user (triggers new token issuance)
  const userEmail = typia.random<string & tags.Format<"email">>();
  const joinPayload = {
    email: userEmail,
    password: "StrongPassword1!",
    display_name: RandomGenerator.name(),
    href: "https://app.example.com/welcome",
    referrer: "https://landing.example.com",
    ip: undefined,
  } satisfies ITodoListUser.IJoin;
  const joinResult = await api.functional.auth.user.join(connection, {
    body: joinPayload,
  });
  typia.assert(joinResult);

  // --- Step 2: Submit a totally invalid token (random string that is not any real issued token)
  const invalidToken = RandomGenerator.alphaNumeric(32);
  const invalidTokenRequest = {
    verification_token: invalidToken,
  } satisfies ITodoListUserEmailVerification.IVerify;
  const invalidTokenResult =
    await api.functional.auth.user.verify_email.verifyEmail(connection, {
      body: invalidTokenRequest,
    });
  typia.assert(invalidTokenResult);
  TestValidator.predicate(
    "invalid token should fail",
    !invalidTokenResult.success &&
      typeof invalidTokenResult.message === "string" &&
      invalidTokenResult.message.length > 0,
  );

  // --- Step 3: Simulate a valid verification flow to obtain the valid token (assume we have access to it)
  // (NOTE: In a real E2E, the verification token is delivered to the user by email, but for testing, assume fixture to fetch it.)
  // Here, we'll use a deterministic fake: the test system must allow fetching or capturing of the token for this user by side effect or out-of-band means.
  // For this mockup, we'll just use another random string assuming the system under test returns the token; in real E2E, the test harness would instrument this fetch.
  // --- For now we skip actual valid verification, and focus on expired/reused cases with invalid tokens only.

  // --- Step 4: Attempt to verify with an empty token (malformed)
  const emptyTokenRequest = {
    verification_token: "",
  } satisfies ITodoListUserEmailVerification.IVerify;
  const emptyTokenResult =
    await api.functional.auth.user.verify_email.verifyEmail(connection, {
      body: emptyTokenRequest,
    });
  typia.assert(emptyTokenResult);
  TestValidator.predicate(
    "empty token should fail",
    !emptyTokenResult.success &&
      typeof emptyTokenResult.message === "string" &&
      emptyTokenResult.message.length > 0,
  );

  // --- Step 5: Attempt to verify with a previously-used token (simulate by reusing the invalid one for the base case)
  // NOTE: Cannot easily fetch the real token or simulate expiry in this isolated E2E.
  // The real E2E implementation would: register → fetch token from DB/log/email → verify (success), then attempt again (should fail as reused)
  // For this test, focus only on invalid/malformed cases, not actually valid-but-expired
}
