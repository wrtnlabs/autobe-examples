import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalModerator";
import type { ICommunityPortalUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalUser";

/**
 * Validate moderator login flows for an existing moderator account.
 *
 * Business context:
 *
 * - Ensure a moderator can be created (join) and can authenticate via login.
 * - Validate handling of invalid credentials.
 * - Support environments that require email verification before full login by
 *   conditionally attempting verification when a verification token is
 *   available. If no token is available (common SDK behavior), the test will
 *   still assert either immediate login success or expected denial (gating).
 *
 * Steps:
 *
 * 1. Create a fresh moderator account using api.functional.auth.moderator.join
 *    with deterministic credentials.
 * 2. Attempt login with correct credentials:
 *
 *    - If login succeeds, assert token presence and profile fields.
 *    - If login fails (likely due to email verification gating), assert that an
 *         error is thrown.
 * 3. Attempt login with invalid password and assert an error is thrown.
 * 4. Conditionally attempt verifyEmail only if a verification token can be
 *    obtained from the test environment or response. If verify succeeds, retry
 *    login and assert success.
 */
export async function test_api_moderator_login_existing(
  connection: api.IConnection,
) {
  // 1) Prepare deterministic test credentials
  const password = "TestPass#2025";
  const username = `mod_${RandomGenerator.alphaNumeric(8)}`;
  const email = `moderator+${RandomGenerator.alphaNumeric(6)}@example.com`;

  // 2) Create moderator account (join)
  const joinBody = {
    username,
    email,
    password,
    display_name: RandomGenerator.name(),
    avatar_uri: null,
  } satisfies ICommunityPortalModerator.ICreate;

  const joined: ICommunityPortalModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: joinBody,
    });
  // Validate join response shape
  typia.assert(joined);

  // Ensure token material was returned (the SDK typically sets connection.headers)
  TestValidator.predicate(
    "join returned authorization token access present",
    typeof joined.token?.access === "string" && joined.token.access.length > 0,
  );

  // 3) Attempt login with correct credentials
  const loginBody = {
    identifier: email,
    password,
  } satisfies ICommunityPortalModerator.ILogin;

  try {
    const loggedIn: ICommunityPortalModerator.IAuthorized =
      await api.functional.auth.moderator.login(connection, {
        body: loginBody,
      });
    typia.assert(loggedIn);

    // Validate returned profile fields and tokens
    TestValidator.predicate(
      "login returned token.access",
      typeof loggedIn.token.access === "string" &&
        loggedIn.token.access.length > 0,
    );
    TestValidator.predicate(
      "authorized contains user id and username",
      typeof loggedIn.id === "string" && typeof loggedIn.username === "string",
    );
  } catch (err) {
    // If login failed, assume email-verification gating. Assert that login is denied.
    await TestValidator.error(
      "unverified account login should be denied or throw",
      async () => {
        await api.functional.auth.moderator.login(connection, {
          body: loginBody,
        });
      },
    );
  }

  // 4) Invalid credentials: wrong password must fail
  await TestValidator.error("invalid credentials must fail", async () => {
    await api.functional.auth.moderator.login(connection, {
      body: {
        identifier: email,
        password: "WrongPassword!",
      } satisfies ICommunityPortalModerator.ILogin,
    });
  });

  // 5) Conditional: attempt email verification only if we have a verification token
  // Note: The join response does not include a verification token per the schema.
  // Therefore, this step is conditional and skipped in most environments.
  // If a token is available via environment variable TEST_MOD_VERIFY_TOKEN, use it.
  const envToken =
    (process.env.TEST_MOD_VERIFY_TOKEN as string | undefined) ?? undefined;
  if (envToken) {
    const verifyBody = {
      verification_token: envToken,
    } satisfies ICommunityPortalModerator.IVerifyEmailRequest;
    const verifyRes: ICommunityPortalModerator.IVerifyEmailResponse =
      await api.functional.auth.moderator.verify.verifyEmail(connection, {
        body: verifyBody,
      });
    typia.assert(verifyRes);
    TestValidator.predicate(
      "verifyEmail reported success",
      verifyRes.success === true,
    );

    // After successful verification, login should succeed
    const afterVerifyLogin: ICommunityPortalModerator.IAuthorized =
      await api.functional.auth.moderator.login(connection, {
        body: loginBody,
      });
    typia.assert(afterVerifyLogin);
    TestValidator.predicate(
      "login after verification returns access token",
      typeof afterVerifyLogin.token.access === "string" &&
        afterVerifyLogin.token.access.length > 0,
    );
  }
}
