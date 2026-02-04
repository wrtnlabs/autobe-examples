import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
export async function test_api_moderator_login_successful(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for moderator registration
  const registerConnection: api.IConnection = { host: connection.host };
  // Step 1: Register a new moderator account using the utility function
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies ICommunityPlatformModerator.IJoin;
  const registeredModerator = await authorize_moderator_join(
    registerConnection,
    { body: moderatorData },
  );
  typia.assert(registeredModerator);
  // Create a new connection for moderator login
  const loginConnection: api.IConnection = { host: connection.host };
  // Step 2: Login with the newly created moderator credentials using the utility function
  const loginData = {
    email: moderatorData.email,
    password: moderatorData.password,
  } satisfies ICommunityPlatformModerator.ILogin;
  const loggedInModerator = await authorize_moderator_login(loginConnection, {
    body: loginData,
  });
  typia.assert(loggedInModerator);
  // Step 3: Validate the authentication response structure
  TestValidator.equals(
    "moderator user identity exists",
    loggedInModerator.user,
    registeredModerator.user,
  );
  TestValidator.equals(
    "moderator community identity exists",
    loggedInModerator.community,
    registeredModerator.community,
  );
  TestValidator.equals(
    "moderator ID matches",
    loggedInModerator.id,
    registeredModerator.id,
  );
  // Step 4: Validate token existence and structure
  TestValidator.predicate(
    "access token exists and is a non-empty string",
    () =>
      typeof loggedInModerator.token.access === "string" &&
      loggedInModerator.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists and is a non-empty string",
    () =>
      typeof loggedInModerator.token.refresh === "string" &&
      loggedInModerator.token.refresh.length > 0,
  );
  // Step 5: Validate expiration timestamps format
  TestValidator.predicate(
    "access token expires at is a valid ISO date-time",
    () =>
      typia.is<string & tags.Format<"date-time">>(
        loggedInModerator.token.expired_at,
      ),
  );
  TestValidator.predicate(
    "refresh token valid until is a valid ISO date-time",
    () =>
      typia.is<string & tags.Format<"date-time">>(
        loggedInModerator.token.refreshable_until,
      ),
  );
  // Step 6: Validate token expiration times are in future
  const now = new Date();
  TestValidator.predicate(
    "access token expires in future",
    () => new Date(loggedInModerator.token.expired_at) > now,
  );
  TestValidator.predicate(
    "refresh token valid until is in future",
    () => new Date(loggedInModerator.token.refreshable_until) > now,
  );
}
