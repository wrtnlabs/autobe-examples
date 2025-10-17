import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

export async function test_api_moderator_login_success(
  connection: api.IConnection,
) {
  // Step 1: Create a new moderator account via join
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderatorUsername: string = RandomGenerator.name()
    .replace(/\s+/g, "_")
    .toLowerCase();
  const moderatorPassword: string = typia.random<
    string &
      tags.MinLength<8> &
      tags.MaxLength<128> &
      tags.Pattern<"^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).+$">
  >();

  const joinedModerator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: moderatorUsername,
        password: moderatorPassword,
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(joinedModerator);

  // Step 2: Authenticate (login) using the created credentials
  const loggedinModerator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
      } satisfies ICommunityPlatformModerator.ILogin,
    });
  typia.assert(loggedinModerator);

  // Step 3: Validate successful authentication response
  TestValidator.equals(
    "moderator ID is valid UUID",
    loggedinModerator.id,
    joinedModerator.id,
  );
  TestValidator.predicate(
    "access token exists",
    () => loggedinModerator.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    () => loggedinModerator.token.refresh.length > 0,
  );
}
