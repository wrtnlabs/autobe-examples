import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";

/**
 * Ensure community moderator login only succeeds for valid, active accounts and
 * fails for invalid credentials.
 *
 * Original business intent: logically deleted moderator accounts (with non-null
 * deleted_at) must not be able to authenticate. Because the public API surface
 * in this test context does not expose any operation that can mark a moderator
 * as logically deleted, this test instead validates the enforceable subset of
 * the behavior:
 *
 * - A freshly registered (implicitly active) moderator can log in using either
 *   username or email as identifier when the correct password is supplied.
 * - Login attempts with the wrong password for an existing moderator are
 *   rejected.
 * - Login attempts using a completely unknown identifier are rejected.
 *
 * This ensures that the authentication flow accepts only valid,
 * credential-matching, existing accounts and treats any other case (including
 * conceptually deleted accounts) as non-authenticatable from the perspective of
 * public APIs.
 *
 * Steps:
 *
 * 1. Join: create a new community moderator with known username, email, and
 *    password.
 * 2. Happy-path login by username and password, assert success.
 * 3. Happy-path login by email and password, assert success.
 * 4. Negative login: same username but wrong password, assert error.
 * 5. Negative login: unknown identifier with any password, assert error.
 */
export async function test_api_community_moderator_login_prevent_deleted_accounts(
  connection: api.IConnection,
) {
  // 1. Register a new community moderator (join)
  const username = `moderator_${RandomGenerator.alphaNumeric(8)}`;
  const email = typia.random<string & tags.Format<"email">>();
  const password = `Pw!${RandomGenerator.alphaNumeric(12)}`;

  const joinBody = {
    username,
    email,
    password,
    display_name: RandomGenerator.name(),
    ip: RandomGenerator.mobile(),
    href: "https://community.example.com/moderator/join",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const joined = await api.functional.auth.communityModerator.join(connection, {
    body: joinBody,
  });
  typia.assert<ICommunityPlatformCommunityModerator.IAuthorized>(joined);

  // 2. Login with username and correct password (should succeed)
  const loginByUsernameBody = {
    identifier: username,
    password,
    href: "https://community.example.com/moderator/login",
    referrer: "https://community.example.com/home",
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const loggedInByUsername = await api.functional.auth.communityModerator.login(
    connection,
    { body: loginByUsernameBody },
  );
  typia.assert<ICommunityPlatformCommunityModerator.IAuthorized>(
    loggedInByUsername,
  );

  // 3. Login with email and correct password (should also succeed)
  const loginByEmailBody = {
    identifier: email,
    password,
    href: "https://community.example.com/moderator/login",
    referrer: "https://community.example.com/home",
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const loggedInByEmail = await api.functional.auth.communityModerator.login(
    connection,
    { body: loginByEmailBody },
  );
  typia.assert<ICommunityPlatformCommunityModerator.IAuthorized>(
    loggedInByEmail,
  );

  // 4. Login with correct identifier but wrong password (should fail)
  const wrongPasswordBody = {
    identifier: username,
    password: `${password}_wrong`,
    href: "https://community.example.com/moderator/login",
    referrer: "https://community.example.com/home",
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  await TestValidator.error(
    "login must fail with wrong password for existing moderator",
    async () => {
      await api.functional.auth.communityModerator.login(connection, {
        body: wrongPasswordBody,
      });
    },
  );

  // 5. Login with unknown identifier (should fail)
  const unknownIdentifierBody = {
    identifier: `nonexistent_${RandomGenerator.alphaNumeric(10)}`,
    password,
    href: "https://community.example.com/moderator/login",
    referrer: "https://community.example.com/home",
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  await TestValidator.error(
    "login must fail for completely unknown moderator identifier",
    async () => {
      await api.functional.auth.communityModerator.login(connection, {
        body: unknownIdentifierBody,
      });
    },
  );
}
