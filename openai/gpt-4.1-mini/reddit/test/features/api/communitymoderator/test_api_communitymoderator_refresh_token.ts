import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

export async function test_api_communitymoderator_refresh_token(
  connection: api.IConnection,
) {
  // 1. Create a new communityModerator account via the join endpoint
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Passw0rd!",
    nickname: RandomGenerator.name(),
  } satisfies IRedditCommunityCommunityModerator.ICreate;

  const joinOutput: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: joinBody,
    });
  typia.assert(joinOutput);

  // 2. Use the refresh token from the join output to refresh JWT tokens
  const refreshBody = {
    refresh_token: joinOutput.token.refresh,
  } satisfies IRedditCommunityCommunityModerator.IRefresh;

  const refreshOutput: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.refresh(connection, {
      body: refreshBody,
    });
  typia.assert(refreshOutput);

  // 3. Validation: The id and email should be the same user
  TestValidator.equals(
    "user id matches after refresh",
    refreshOutput.id,
    joinOutput.id,
  );
  TestValidator.equals(
    "user email matches after refresh",
    refreshOutput.email,
    joinOutput.email,
  );

  // 4. Validation: The JWT access tokens should be strings and updated
  TestValidator.predicate(
    "refresh output access token exists",
    typeof refreshOutput.token.access === "string" &&
      refreshOutput.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh output refresh token exists",
    typeof refreshOutput.token.refresh === "string" &&
      refreshOutput.token.refresh.length > 0,
  );

  // 5. Validation: The refresh token in output is different or equal (usually it may be updated depending on impl), but refreshOutput.token.access must at least be different from initial
  TestValidator.notEquals(
    "access token should be different after refresh",
    refreshOutput.token.access,
    joinOutput.token.access,
  );
}
