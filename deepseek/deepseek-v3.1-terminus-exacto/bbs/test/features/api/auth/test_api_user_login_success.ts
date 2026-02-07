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

/**
 * Test successful user authentication with valid credentials.
 *
 * Creates a new user account via join operation, then attempts to login with
 * the same credentials. Verifies that the login returns valid JWT tokens
 * (access and refresh tokens), user profile information (id, email, display_name),
 * and proper expiration timestamps. Validates that the response structure
 * matches the expected authorized user DTO format.
 */
export async function test_api_user_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Create a new user account via join operation
  const userCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IDiscussionBoardUser.IJoin;
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_user_join(joinConnection, {
    body: userCredentials,
  });
  typia.assert(joinResult);
  // Create a new connection for login operation
  const loginConnection: api.IConnection = { host: connection.host };
  // Attempt login with the same credentials
  const loginResult = await authorize_user_login(loginConnection, {
    body: {
      email: userCredentials.email,
      password: userCredentials.password,
    } satisfies IDiscussionBoardUser.ILogin,
  });
  typia.assert(loginResult);
  // Validate user profile information matches
  TestValidator.equals(
    "email matches",
    loginResult.email,
    userCredentials.email,
  );
  TestValidator.equals(
    "display name matches",
    loginResult.display_name,
    userCredentials.display_name,
  );
  TestValidator.equals("bio matches", loginResult.bio, userCredentials.bio);
  // Validate token expiration business logic
  TestValidator.predicate(
    "expired_at is before refreshable_until",
    new Date(loginResult.token.expired_at) <
      new Date(loginResult.token.refreshable_until),
  );
}
