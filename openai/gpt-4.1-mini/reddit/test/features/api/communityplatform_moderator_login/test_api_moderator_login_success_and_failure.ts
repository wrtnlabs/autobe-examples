import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_login_success_and_failure(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful moderator login with valid email and password.
  // - Register a new moderator account to create valid credentials.
  // - Login using the registered email and correct password.
  // - Verify response includes valid authorization tokens (access and refresh) with expiration timestamps.
  // - Confirm the returned moderator ID matches the registered user.
  // - Validate HTTP status code 200 and JSON response structure conforms to ICommunityPlatformModerator.IAuthorized.
  // Prepare test data
  const testEmail = typia.random<string & tags.Format<"email">>();
  const testUsername = RandomGenerator.name(1);
  const testPassword = "123456";
  // Register moderator (join)
  const joinConnection: api.IConnection = { host: connection.host };
  const moderatorJoin = await authorize_moderator_join(joinConnection, {
    body: {
      email: testEmail,
      username: testUsername,
      displayName: null,
      bio: null,
      avatarUrl: null,
    },
  });
  typia.assert(moderatorJoin);
  // Login with correct password
  const loginConnection: api.IConnection = { host: connection.host };
  const successLogin = await authorize_moderator_login(loginConnection, {
    body: {
      email: testEmail,
      password: testPassword,
    },
  });
  typia.assert(successLogin);
  // Assertions
  TestValidator.equals(
    "moderator ID matches after successful login",
    successLogin.id,
    moderatorJoin.id,
  );
  TestValidator.predicate(
    "access token is not empty",
    successLogin.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is not empty",
    successLogin.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token expire date is valid ISO 8601",
    !isNaN(Date.parse(successLogin.token.expired_at)),
  );
  TestValidator.predicate(
    "refreshable until date is valid ISO 8601",
    !isNaN(Date.parse(successLogin.token.refreshable_until)),
  );
  // Scenario 2: Failed moderator login with incorrect password.
  // - Register a new moderator account to create valid credentials.
  // - Attempt login with the registered email but incorrect password.
  // - Expect HTTP status code 401 Unauthorized.
  // - Response body should indicate authentication failure without revealing sensitive details.
  // Prepare test data
  const failEmail = typia.random<string & tags.Format<"email">>();
  const failUsername = RandomGenerator.name(1);
  // Register moderator for failure case
  const joinConnectionFail: api.IConnection = { host: connection.host };
  const moderatorJoinFail = await authorize_moderator_join(joinConnectionFail, {
    body: {
      email: failEmail,
      username: failUsername,
      displayName: null,
      bio: null,
      avatarUrl: null,
    },
  });
  typia.assert(moderatorJoinFail);
  // Attempt login with wrong password
  const loginConnectionFail: api.IConnection = { host: connection.host };
  await TestValidator.error("failed login with wrong password", async () => {
    await authorize_moderator_login(loginConnectionFail, {
      body: {
        email: failEmail,
        password: "wrongpassword",
      },
    });
  });
}
