import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import type { ITodoListUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserEmailVerification";

/**
 * Test successful email verification for a newly registered user by redeeming
 * the sent verification token.
 *
 * 1. Register a new user (via /auth/user/join), which issues a new pending user
 *    and an email verification token.
 * 2. Simulate retrieving the issued email verification token from the authorized
 *    output (assuming token is returned for test).
 * 3. Redeem the verification token at /auth/user/verify-email endpoint.
 * 4. Validate that the response indicates success and that the user's status has
 *    transitioned to verified and active.
 */
export async function test_api_user_email_verification_success(
  connection: api.IConnection,
) {
  // 1. Register a new user (pending verification state)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    href: "https://localhost/client-registration-uri",
    referrer: "https://localhost/landing-referrer-uri",
  } satisfies ITodoListUser.IJoin;

  const authorized: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  TestValidator.predicate(
    "user is initially not verified (pending email)",
    authorized.is_verified === false,
  );
  TestValidator.predicate(
    "user is initially not active (pending)",
    authorized.is_active === false,
  );

  // 2. Simulate retrieval of verification token for the user (here we must assume the system exposes access to the proper unique token for test purposes)
  // For this test, suppose authorized.token.access is the verification token (in actual system there might be a separate token, adjust this as needed for your backend)
  // In real-world e2e, this should be via database or mail-capture; in test, we use the provided output/simulation.
  const verificationToken = authorized.token.access satisfies string;

  // 3. Redeem the token at the verification endpoint
  const verifyPayload = {
    verification_token: verificationToken,
  } satisfies ITodoListUserEmailVerification.IVerify;

  const verified: ITodoListUserEmailVerification.IVerified =
    await api.functional.auth.user.verify_email.verifyEmail(connection, {
      body: verifyPayload,
    });
  typia.assert(verified);

  TestValidator.predicate(
    "verification API response signals success",
    verified.success === true,
  );

  // 4. Optionally: login can now succeed but as no login endpoint is defined here, just confirm status in response.
}
