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

/**
 * Test successful moderator login with valid credentials.
 * 1. Create a moderator account via join endpoint
 * 2. Use credentials to log in
 * 3. Verify authorization token and profile information
 * 4. Confirm last_login_at is updated
 */
export async function test_api_moderator_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Create moderator account via join endpoint
  const joinConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.alphabets(8),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    avatar_url: typia.random<string & tags.Format<"uri">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ICommunityPlatformModerator.IJoin;
  const joinedModerator = await authorize_moderator_join(joinConnection, {
    body: joinBody,
  });
  typia.assert(joinedModerator);
  // Create new connection for login
  const loginConnection: api.IConnection = { host: connection.host };
  // Login with created credentials
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies ICommunityPlatformModerator.ILogin;
  const loggedInModerator = await authorize_moderator_login(loginConnection, {
    body: loginBody,
  });
  typia.assert(loggedInModerator);
  // Verify token structure
  TestValidator.predicate(
    "access token exists",
    loggedInModerator.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    loggedInModerator.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid date",
    !isNaN(new Date(loggedInModerator.token.expired_at).getTime()),
  );
  TestValidator.predicate(
    "refreshable_until is valid date",
    !isNaN(new Date(loggedInModerator.token.refreshable_until).getTime()),
  );
  // Verify profile information matches
  TestValidator.equals("id matches", loggedInModerator.id, joinedModerator.id);
  TestValidator.equals(
    "email matches",
    loggedInModerator.email,
    joinBody.email,
  );
  TestValidator.equals(
    "username matches",
    loggedInModerator.username,
    joinBody.username,
  );
  TestValidator.equals(
    "display_name matches",
    loggedInModerator.display_name,
    joinBody.display_name,
  );
  // Verify last_login_at is updated
  TestValidator.predicate(
    "last_login_at should be populated",
    loggedInModerator.last_login_at !== undefined,
  );
  // Verify account is active
  TestValidator.predicate(
    "account should be active",
    loggedInModerator.is_active === true,
  );
  TestValidator.predicate(
    "permission_level should exist",
    loggedInModerator.permission_level.length > 0,
  );
}
