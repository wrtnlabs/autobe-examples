import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test successful member login with valid credentials.
 * 1. Create a member account using authorize_member_join
 * 2. Login with the same credentials using authorize_member_login
 * 3. Verify response includes all expected fields
 * 4. Verify token structure
 * 5. Validate member information matches
 */
export async function test_api_member_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Generate test credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const username = RandomGenerator.name(1);
  // 1. Create member account
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(joinConnection, {
    body: {
      email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(email),
      password,
      username,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(joinResult);
  // 2. Login with the same credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_member_login(loginConnection, {
    body: {
      email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(email),
      password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformMember.ILogin,
  });
  typia.assert(loginResult);
  // 3. Verify response includes all expected fields
  TestValidator.predicate("has member id", loginResult.id.length > 0);
  TestValidator.predicate("has username", loginResult.username.length > 0);
  TestValidator.predicate("has email", loginResult.email.length > 0);
  TestValidator.predicate(
    "has karma_score",
    typeof loginResult.karma_score === "number",
  );
  TestValidator.predicate(
    "has accessToken",
    loginResult.accessToken.length > 0,
  );
  TestValidator.predicate("has expiresAt", loginResult.expiresAt.length > 0);
  // 4. Verify token structure
  TestValidator.predicate(
    "token has access",
    loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "token has refresh",
    loginResult.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token has expired_at",
    loginResult.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "token has refreshable_until",
    loginResult.token.refreshable_until.length > 0,
  );
  // 5. Validate member information matches
  TestValidator.equals("email matches", loginResult.email, email);
  TestValidator.equals("username matches", loginResult.username, username);
  TestValidator.equals("id matches", loginResult.id, joinResult.id);
}