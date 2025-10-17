import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityOwner";

/**
 * Authenticate a community owner via email and password.
 *
 * Flow:
 *
 * 1. Register a fresh community owner with valid email/username/password and
 *    consent timestamps
 * 2. Login using the registered email and password
 * 3. Validate the authorized payload and token fields
 * 4. Repeat login to verify idempotent sign-in behavior and consistent subject id
 */
export async function test_api_community_owner_login_with_email(
  connection: api.IConnection,
) {
  // 1) Register a fresh community owner to get known credentials
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const username: string = RandomGenerator.alphabets(12); // matches ^[A-Za-z0-9_]{3,20}$
  const password: string = RandomGenerator.alphaNumeric(12); // 8-64 chars

  const joinBody = {
    email,
    username,
    password,
    display_name: RandomGenerator.name(2),
    avatar_uri: typia.random<string & tags.Format<"uri">>(),
    terms_accepted_at: new Date().toISOString(),
    privacy_accepted_at: new Date().toISOString(),
    marketing_opt_in: true,
    marketing_opt_in_at: new Date().toISOString(),
  } satisfies ICommunityPlatformCommunityOwner.ICreate;

  const joined: ICommunityPlatformCommunityOwner.IAuthorized =
    await api.functional.auth.communityOwner.join(connection, {
      body: joinBody,
    });
  typia.assert(joined);

  // Basic business validations on token presence and role (if present)
  TestValidator.predicate(
    "joined: access token is non-empty",
    joined.token.access.length > 0,
  );
  TestValidator.predicate(
    "joined: refresh token is non-empty",
    joined.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "joined: role is communityOwner or undefined",
    joined.role === "communityOwner" || joined.role === undefined,
  );

  // 2) Login with the registered email and password
  const loginBody = {
    email,
    password,
  } satisfies ICommunityPlatformCommunityOwner.ILogin;

  const loggedIn: ICommunityPlatformCommunityOwner.IAuthorized =
    await api.functional.auth.communityOwner.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedIn);

  // 3) Validate token shape by typia and basic business checks
  TestValidator.equals(
    "login: subject id should match joined id",
    loggedIn.id,
    joined.id,
  );
  TestValidator.predicate(
    "login: access token is non-empty",
    loggedIn.token.access.length > 0,
  );
  TestValidator.predicate(
    "login: refresh token is non-empty",
    loggedIn.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "login: role is communityOwner or undefined",
    loggedIn.role === "communityOwner" || loggedIn.role === undefined,
  );

  // 4) Repeat login to verify policy-level idempotency (repeated sign-in allowed)
  const loggedInAgain: ICommunityPlatformCommunityOwner.IAuthorized =
    await api.functional.auth.communityOwner.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedInAgain);

  TestValidator.equals(
    "repeat login: subject id stays consistent",
    loggedInAgain.id,
    loggedIn.id,
  );
  TestValidator.predicate(
    "repeat login: access token present",
    loggedInAgain.token.access.length > 0,
  );
  TestValidator.predicate(
    "repeat login: refresh token present",
    loggedInAgain.token.refresh.length > 0,
  );
}
