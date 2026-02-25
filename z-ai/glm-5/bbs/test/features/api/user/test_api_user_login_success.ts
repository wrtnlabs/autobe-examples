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
 * Test successful user login with valid credentials.
 *
 * 1. Create a new user account via join with valid credentials
 * 2. Login with the same email and password
 * 3. Validate the login response contains valid tokens and user profile
 */
export async function test_api_user_login_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Prepare user credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const displayName = RandomGenerator.name(1);
  // 2. Create a new user account via join
  const userConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_user_join(userConnection, {
    body: {
      email,
      password,
      displayName,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(joinResult);
  // 3. Login with the same credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_user_login(loginConnection, {
    body: {
      email,
      password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(loginResult);
  // 4. Validate login response
  TestValidator.equals("email matches", loginResult.email, email);
  TestValidator.equals(
    "display name matches",
    loginResult.displayName,
    displayName,
  );
  TestValidator.equals(
    "permission level is MEMBER",
    loginResult.permission_level,
    "MEMBER",
  );
  TestValidator.equals(
    "user ID matches join result",
    loginResult.id,
    joinResult.id,
  );
  TestValidator.predicate(
    "has valid access token",
    loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "has valid refresh token",
    loginResult.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "article count is zero for new user",
    loginResult.articleCount === 0,
  );
  TestValidator.predicate(
    "comment count is zero for new user",
    loginResult.commentCount === 0,
  );
  TestValidator.predicate(
    "memberSince is valid date",
    new Date(loginResult.memberSince) instanceof Date,
  );
}
