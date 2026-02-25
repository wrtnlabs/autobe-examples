import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Create test user credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const display_name = RandomGenerator.name();
  // Create user via join endpoint
  const userConnection: api.IConnection = { host: connection.host };
  const joinedUser = await authorize_user_join(userConnection, {
    body: {
      email,
      password,
      display_name,
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(joinedUser);
  // Create separate connection for login (connection isolation pattern)
  const loginConnection: api.IConnection = { host: connection.host };
  // Perform login with valid credentials
  const loggedInUser = await authorize_user_login(loginConnection, {
    body: {
      email,
      password,
    } satisfies IDiscussionBoardUser.ILogin,
  });
  typia.assert(loggedInUser);
  // Validate user identity information matches
  TestValidator.equals("user id should match", loggedInUser.id, joinedUser.id);
  TestValidator.equals("email should match", loggedInUser.email, email);
  TestValidator.equals(
    "display name should match",
    loggedInUser.display_name,
    display_name,
  );
  // Validate authentication tokens exist
  TestValidator.predicate(
    "access token should exist",
    loggedInUser.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should exist",
    loggedInUser.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expiration timestamp should be valid",
    new Date(loggedInUser.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "refreshable until timestamp should be valid",
    new Date(loggedInUser.token.refreshable_until) > new Date(),
  );
  // Validate connection headers were updated
  TestValidator.predicate(
    "login connection should have authorization header",
    loginConnection.headers?.Authorization !== undefined,
  );
  TestValidator.predicate(
    "authorization header should contain access token",
    typeof loginConnection.headers?.Authorization === "string" && 
    loginConnection.headers.Authorization.includes(loggedInUser.token.access),
  );
}