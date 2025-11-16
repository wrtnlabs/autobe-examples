import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

export async function test_api_communitymoderator_login_existing_user(
  connection: api.IConnection,
) {
  // Step 1: Create a new communityModerator account
  const createBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    nickname: RandomGenerator.name(),
  } satisfies IRedditCommunityCommunityModerator.ICreate;

  const createdUser: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: createBody,
    });
  typia.assert(createdUser);

  // Step 2: Login using the exact credentials of the created user
  const loginBody = {
    email: createBody.email,
    password: createBody.password,
    ip: null,
    href: "https://redditcommunity.example.com/login",
    referrer: "https://google.com/",
  } satisfies IRedditCommunityCommunityModerator.ILogin;

  const loggedInUser: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: loginBody,
    });
  typia.assert(loggedInUser);

  // Step 3: Validate login returns valid authorization token
  TestValidator.predicate(
    "login provides access token",
    loggedInUser.token.access.length > 0,
  );
  TestValidator.predicate(
    "login provides refresh token",
    loggedInUser.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token expired_at is a valid ISO date",
    !isNaN(Date.parse(loggedInUser.token.expired_at)),
  );
  TestValidator.predicate(
    "token refreshable_until is a valid ISO date",
    !isNaN(Date.parse(loggedInUser.token.refreshable_until)),
  );

  // Step 4: Validate the logged in user matches the created user details
  TestValidator.equals("user id matches", loggedInUser.id, createdUser.id);
  TestValidator.equals(
    "user email matches",
    loggedInUser.email,
    createBody.email,
  );
  TestValidator.equals(
    "user created_at matches",
    loggedInUser.created_at,
    createdUser.created_at,
  );
  TestValidator.equals(
    "user updated_at matches",
    loggedInUser.updated_at,
    createdUser.updated_at,
  );
  TestValidator.equals(
    "user deleted_at matches",
    loggedInUser.deleted_at ?? null,
    createdUser.deleted_at ?? null,
  );
}
