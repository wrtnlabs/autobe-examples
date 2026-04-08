import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test successful member login workflow with registration and authentication.
 *
 * Validates the complete member authentication flow by first registering a new account and then logging in with the same credentials. Ensures that the login response contains valid JWT tokens and member profile information matching the registered account.
 *
 * The test verifies token structure including access_token, refresh_token, expired_at, and refreshable_until fields. Member profile validation includes id, email, username, display_name, bio, avatar, and karma score to ensure data consistency between registration and authentication.
 *
 * 1. Register a new member account with randomized credentials (email, password, username).
 * 2. Create a new connection and attempt login with the registered credentials.
 * 3. Validate login response contains proper token structure and member profile.
 * 4. Verify member profile data matches the originally registered account information.
 */
export async function test_api_member_login_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account with stored credentials
  const password = RandomGenerator.alphaNumeric(16);
  const email = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.name(1);
  const joinResult: IRedditCommunityMember.IAuthorized =
    await authorize_member_join(connection, {
      body: {
        email: email,
        password: password,
        username: username,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IRedditCommunityMember.IJoin,
    });
  typia.assert(joinResult);
  // 2. Create new connection for login and authenticate with same credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult: IRedditCommunityMember.IAuthorized =
    await authorize_member_login(loginConnection, {
      body: {
        email: email,
        password: password,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IRedditCommunityMember.ILogin,
    });
  typia.assert(loginResult);
  // 3. Validate member profile matches registered account
  TestValidator.equals("email matches", loginResult.email, joinResult.email);
  TestValidator.equals(
    "username matches",
    loginResult.username,
    joinResult.username,
  );
  TestValidator.predicate("has valid member id", loginResult.id.length > 0);
  TestValidator.predicate(
    "has display name",
    loginResult.display_name.length > 0,
  );
  TestValidator.predicate("karma is non-negative", loginResult.karma >= 0);
}
