import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";

/**
 * Validate community member self-signup and login flows using available SDK
 * functions. This test performs the following adapted steps (refresh and
 * community-creation steps from the original scenario are omitted because the
 * provided SDK only exposes join and login endpoints):
 *
 * 1. Create a new community member via POST /auth/communityMember/join
 *    (api.functional.auth.communityMember.join) using a unique username/email.
 * 2. Authenticate the created member via POST /auth/communityMember/login
 *    (api.functional.auth.communityMember.login) and assert returned
 *    authorization token and session objects.
 * 3. Negative test: attempt login with correct username but incorrect password,
 *    expecting an error.
 *
 * Validation focuses on: member identity consistency, presence of token.access
 * and token.refresh, session.id / session.created_at presence, and proper error
 * behavior for wrong credentials.
 */
export async function test_api_community_member_login_existing(
  connection: api.IConnection,
) {
  // 1) Prepare unique credentials
  const suffix = RandomGenerator.alphaNumeric(6);
  const username = `test_${suffix}`;
  const email = `${username}@example.test`;
  const password = "Passw0rd!"; // Meets DTO password constraints

  // 2) Join (create account)
  const joinBody = {
    email,
    username,
    password,
    // Optional profile fields omitted. Provide required session_context.
    session_context: {
      href: "http://localhost/",
      referrer: "http://localhost/",
      ip: null,
      session_ttl_seconds: null,
    },
  } satisfies ICommunityBbsCommunityMember.ICreate;

  const joined: ICommunityBbsCommunityMember.IAuthorized =
    await api.functional.auth.communityMember.join(connection, {
      body: joinBody,
    });
  typia.assert(joined);

  // Basic assertions about the created member and issued tokens/sessions
  TestValidator.equals(
    "joined member username matches request",
    joined.member.username,
    username,
  );
  TestValidator.predicate(
    "joined has access token",
    typeof joined.token.access === "string" && joined.token.access.length > 0,
  );
  TestValidator.predicate(
    "joined has refresh token",
    typeof joined.token.refresh === "string" && joined.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "joined session present",
    typeof joined.session?.id === "string" && joined.session.id.length > 0,
  );

  // 3) Login using username (usernameOrEmail may accept username or email)
  const loginBody = {
    usernameOrEmail: username,
    password,
    href: "http://localhost/",
    referrer: "http://localhost/",
    ip: null,
    session_ttl_seconds: null,
  } satisfies ICommunityBbsCommunityMember.ILogin;

  const loggedIn: ICommunityBbsCommunityMember.IAuthorized =
    await api.functional.auth.communityMember.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedIn);

  // Post-login assertions
  TestValidator.equals(
    "login returns same member id as join",
    loggedIn.member.id,
    joined.member.id,
  );
  TestValidator.predicate(
    "login has non-empty access token",
    typeof loggedIn.token.access === "string" &&
      loggedIn.token.access.length > 0,
  );
  TestValidator.predicate(
    "login has non-empty refresh token",
    typeof loggedIn.token.refresh === "string" &&
      loggedIn.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "login created session has id",
    typeof loggedIn.session.id === "string" && loggedIn.session.id.length > 0,
  );
  TestValidator.predicate(
    "login session created_at present",
    typeof loggedIn.session.created_at === "string" &&
      loggedIn.session.created_at.length > 0,
  );

  // 4) Negative case: incorrect password should fail
  await TestValidator.error(
    "login with incorrect password should fail",
    async () => {
      await api.functional.auth.communityMember.login(connection, {
        body: {
          usernameOrEmail: username,
          password: "WrongPassword1!",
          href: "http://localhost/",
          referrer: "http://localhost/",
          ip: null,
          session_ttl_seconds: null,
        } satisfies ICommunityBbsCommunityMember.ILogin,
      });
    },
  );
}
