import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalMember";

export async function test_api_member_login_successful_authentication(
  connection: api.IConnection,
) {
  /**
   * Purpose: Ensure that a freshly registered member can authenticate via POST
   * /auth/member/login and that the response returns authorization tokens and a
   * minimal safe profile (IAuthorized) without exposing secrets.
   *
   * Steps:
   *
   * 1. Register a new member via api.functional.auth.member.join
   * 2. Assert joined response with typia.assert()
   * 3. Login using the created account via api.functional.auth.member.login
   * 4. Assert login response and validate tokens/profile
   */

  // 1) Prepare unique test credentials
  const username = `e2e_user_${RandomGenerator.alphaNumeric(6)}`;
  const email = `${username}@example.com`;
  const password = `P@ssw0rd!${RandomGenerator.alphaNumeric(4)}`;

  // 2) Register the member
  const joinBody = {
    username,
    email,
    password,
    display_name: RandomGenerator.name(),
  } satisfies ICommunityPortalMember.ICreate;

  const joined: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: joinBody,
    });
  // Validate the response shape
  typia.assert(joined);

  // Basic business validations
  TestValidator.predicate(
    "joined: has id",
    typeof joined.id === "string" && joined.id.length > 0,
  );
  TestValidator.predicate(
    "joined: access token present",
    typeof joined.token.access === "string" && joined.token.access.length > 0,
  );
  TestValidator.predicate(
    "joined: refresh token present",
    typeof joined.token.refresh === "string" && joined.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "joined: token expiration present",
    typeof joined.token.expired_at === "string" &&
      joined.token.expired_at.length > 0,
  );

  // 3) Perform login with identifier (use email)
  const loginBody = {
    identifier: email,
    password,
  } satisfies ICommunityPortalMember.ILogin;

  const logged: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.login(connection, {
      body: loginBody,
    });
  typia.assert(logged);

  // 4) Assert tokens and profile consistency
  TestValidator.predicate(
    "login: access token present",
    typeof logged.token.access === "string" && logged.token.access.length > 0,
  );
  TestValidator.predicate(
    "login: refresh token present",
    typeof logged.token.refresh === "string" && logged.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "login: token expiration present",
    typeof logged.token.expired_at === "string" &&
      logged.token.expired_at.length > 0,
  );

  // 5) Business logic validations
  TestValidator.equals("login: id matches joined id", logged.id, joined.id);

  // Ensure no server-only sensitive property leaked (runtime check)
  TestValidator.predicate(
    "login: password_hash not exposed",
    !("password_hash" in logged),
  );
}
