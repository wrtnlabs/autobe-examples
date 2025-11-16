import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";

/**
 * Validate that a newly registered community moderator can log in successfully
 * with the same credentials, and receives a fresh authorization token bundle
 * for the same actor.
 *
 * Business workflow:
 *
 * 1. Register (join) a brand-new community moderator using unique username, email,
 *    and a strong password via POST /auth/communityModerator/join.
 * 2. Capture the authorized moderator context (id and initial token bundle) from
 *    the join response.
 * 3. Perform a separate login via POST /auth/communityModerator/login using the
 *    same email and password.
 * 4. Verify that login succeeds, returns an IAuthorized context for the same
 *    moderator id, and that the newly issued token bundle is structurally valid
 *    and different from the join-time token bundle.
 */
export async function test_api_community_moderator_login_success_after_join(
  connection: api.IConnection,
) {
  // 1. Prepare registration (join) payload with unique credentials.
  const username: string = RandomGenerator.alphabets(12);
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string = RandomGenerator.alphaNumeric(24);
  const href: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const referrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const joinBody = {
    username,
    email,
    password,
    href,
    referrer,
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const joinAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformCommunityModerator.IAuthorized>(
    joinAuthorized,
  );

  const joinModeratorId = joinAuthorized.id;
  const joinToken: IAuthorizationToken = joinAuthorized.token;
  typia.assert<IAuthorizationToken>(joinToken);

  // Basic sanity checks on join token fields.
  TestValidator.predicate(
    "join access token must be non-empty string",
    joinToken.access.length > 0,
  );
  TestValidator.predicate(
    "join refresh token must be non-empty string",
    joinToken.refresh.length > 0,
  );
  TestValidator.predicate(
    "join expired_at must be non-empty string",
    joinToken.expired_at.length > 0,
  );
  TestValidator.predicate(
    "join refreshable_until must be non-empty string",
    joinToken.refreshable_until.length > 0,
  );

  // 2. Login using the same email and password (identifier = email).
  const loginBody = {
    identifier: email,
    password,
    href,
    referrer,
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const loginAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: loginBody,
    });
  typia.assert<ICommunityPlatformCommunityModerator.IAuthorized>(
    loginAuthorized,
  );

  const loginModeratorId = loginAuthorized.id;
  const loginToken: IAuthorizationToken = loginAuthorized.token;
  typia.assert<IAuthorizationToken>(loginToken);

  // 3. Assert moderator identity consistency between join and login.
  TestValidator.equals(
    "login moderator id equals join moderator id",
    loginModeratorId,
    joinModeratorId,
  );

  // 4. Sanity checks on login token fields.
  TestValidator.predicate(
    "login access token must be non-empty string",
    loginToken.access.length > 0,
  );
  TestValidator.predicate(
    "login refresh token must be non-empty string",
    loginToken.refresh.length > 0,
  );
  TestValidator.predicate(
    "login expired_at must be non-empty string",
    loginToken.expired_at.length > 0,
  );
  TestValidator.predicate(
    "login refreshable_until must be non-empty string",
    loginToken.refreshable_until.length > 0,
  );

  // 5. Ensure that login issues a fresh token bundle, not reusing the join one.
  TestValidator.notEquals(
    "login access token differs from join access token",
    loginToken.access,
    joinToken.access,
  );
  TestValidator.notEquals(
    "login refresh token differs from join refresh token",
    loginToken.refresh,
    joinToken.refresh,
  );
}
