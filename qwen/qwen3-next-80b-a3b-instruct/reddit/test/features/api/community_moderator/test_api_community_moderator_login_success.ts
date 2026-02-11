import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_community_moderator_join } from "../../../authorize/authorize_community_moderator_join";
import { authorize_community_moderator_login } from "../../../authorize/authorize_community_moderator_login";
import { authorize_community_moderator_refresh } from "../../../authorize/authorize_community_moderator_refresh";

export async function test_api_community_moderator_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Create a new moderator account first
  const joinConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const plainPassword = RandomGenerator.alphaNumeric(16);
  const password_hash = RandomGenerator.alphaNumeric(16); // Simulated hash
  const moder = await authorize_community_moderator_join(joinConnection, {
    body: {
      email,
      password_hash,
      display_name: RandomGenerator.name(),
    } satisfies IRedditCommunityCommunityModerator.IJoin,
  });
  typia.assert(moder);
  // Use the same email and corresponding plain password for login
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResponse = await authorize_community_moderator_login(
    loginConnection,
    {
      body: {
        email,
        password: plainPassword,
      } satisfies IRedditCommunityCommunityModerator.ILogin,
    },
  );
  typia.assert(loginResponse);
  // Validate entire IAuthorized structure
  TestValidator.equals(
    "access_token exists",
    typeof loginResponse.access_token,
    "string",
  );
  TestValidator.equals(
    "refresh_token exists",
    typeof loginResponse.refresh_token,
    "string",
  );
  TestValidator.equals(
    "expires_in is 900 seconds",
    loginResponse.expires_in,
    900,
  );
  TestValidator.equals(
    "token.access exists",
    typeof loginResponse.token.access,
    "string",
  );
  TestValidator.equals(
    "token.refresh exists",
    typeof loginResponse.token.refresh,
    "string",
  );
  TestValidator.equals(
    "token.expired_at format",
    typeof loginResponse.token.expired_at,
    "string",
  );
  TestValidator.equals(
    "token.refreshable_until format",
    typeof loginResponse.token.refreshable_until,
    "string",
  );
  // Validate token properties are ISO 8601 date-time format
  const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
  TestValidator.predicate("token.expired_at is ISO 8601 date-time", () =>
    iso8601Regex.test(loginResponse.token.expired_at),
  );
  TestValidator.predicate("token.refreshable_until is ISO 8601 date-time", () =>
    iso8601Regex.test(loginResponse.token.refreshable_until),
  );
  // Ensure expiration is 900 seconds (15 minutes)
  TestValidator.predicate(
    "expires_in is 900 seconds",
    () => loginResponse.expires_in === 900,
  );
  // Validate session creation implicitly - successful login with correct credentials and valid response implies session creation
  // We can't directly check the database, but the server's response proving authentication is sufficient
  // This matches the specification which states "a session record is created in reddit_community_community_moderator_sessions"
  // The return of valid tokens confirms session creation
}
