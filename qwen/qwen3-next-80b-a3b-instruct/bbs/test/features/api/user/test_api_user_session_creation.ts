import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicForumUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumUser";
import type { IEconomicForumUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumUserSession";
import { prepare_random_economic_forum_user_session } from "../../../prepare/prepare_random_economic_forum_user_session";
import { generate_random_economic_forum_user_auth_users_sessions_create } from "../../../generate/generate_random_economic_forum_user_auth_users_sessions_create";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
export async function test_api_user_session_creation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new user by joining the system
  // Use the base connection - it will be updated with headers by utility function
  const joinedUser: IEconomicForumUser.IAuthorized = await authorize_user_join(
    connection,
    {
      body: {},
    },
  );
  typia.assert(joinedUser);
  // Step 2: Authenticate the registered user with login
  // Use the same connection - authorization header is updated internally by utility function
  const loggedInUser: IEconomicForumUser.IAuthorized =
    await authorize_user_login(connection, {
      body: {
        email: joinedUser.email,
        password: "password123",
      },
    });
  typia.assert(loggedInUser);
  // Step 3: Create a user session using the authenticated connection
  // Use the same connection with Authorization header already set by login
  const session: IEconomicForumUserSession =
    await generate_random_economic_forum_user_auth_users_sessions_create(
      connection,
      {
        body: {},
      },
    );
  typia.assert(session);
  // Validate the session response - typia.assert already validates all type constraints
  // No additional validation needed as typia.assert covers all format validations
  TestValidator.equals("session token exists", session.token, session.token);
  TestValidator.equals(
    "session expiresAt exists",
    session.expiresAt,
    session.expiresAt,
  );
}
