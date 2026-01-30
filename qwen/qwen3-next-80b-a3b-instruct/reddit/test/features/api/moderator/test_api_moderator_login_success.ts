import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsModerator";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
export async function test_api_moderator_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new moderator account for testing
  const moderatorCreds: ICommunityBbsModerator.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
  };
  const adminConnection: api.IConnection = { host: connection.host };
  const moderator: ICommunityBbsModerator.IAuthorized =
    await authorize_moderator_join(adminConnection, {
      body: moderatorCreds,
    });
  typia.assert(moderator);
  // Step 2: Use the same credentials to log in the moderator
  const loginConnection: api.IConnection = { host: connection.host };
  const loggedinModerator: ICommunityBbsModerator.IAuthorized =
    await authorize_moderator_login(loginConnection, {
      body: moderatorCreds,
    });
  typia.assert(loggedinModerator);
  // Step 3: Validate the login response contains all expected properties
  TestValidator.equals(
    "moderator id matches",
    moderator.id,
    loggedinModerator.id,
  );
  TestValidator.equals(
    "moderator email matches",
    moderator.email,
    loggedinModerator.email,
  );
  TestValidator.equals(
    "token type is bearer",
    loggedinModerator.token_type,
    "bearer",
  );
  TestValidator.equals(
    "access token exists",
    loggedinModerator.token.access.length > 0,
    true,
  );
  TestValidator.equals(
    "refresh token exists",
    loggedinModerator.token.refresh.length > 0,
    true,
  );
  TestValidator.equals(
    "expired_at is date-time format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      loggedinModerator.token.expired_at,
    ),
    true,
  );
  TestValidator.equals(
    "refreshable_until is date-time format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      loggedinModerator.token.refreshable_until,
    ),
    true,
  );
  // Step 4: Verify connection was updated with authorization header
  TestValidator.predicate(
    "connection has authorization header",
    () => !!loginConnection.headers?.Authorization,
  );
  TestValidator.equals(
    "authorization header matches access token",
    loginConnection.headers?.Authorization,
    `Bearer ${loggedinModerator.token.access}`,
  );
}
