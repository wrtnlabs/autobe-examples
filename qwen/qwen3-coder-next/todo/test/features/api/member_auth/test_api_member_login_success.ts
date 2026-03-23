import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member
  const registerConnection: api.IConnection = { host: connection.host };
  const registerEmail = typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>();
  const registerPassword = "SecurePassword123!";
  await authorize_member_join(registerConnection, {
    body: {
      email: registerEmail,
      password: registerPassword,
      href: "https://example.com/register",
      referrer: "https://referrer.com",
    } satisfies ITodoAppMemberSession.IJoin,
  });
  // Step 2: Login with valid credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResponse = await authorize_member_login(loginConnection, {
    body: {
      email: registerEmail,
      password: registerPassword,
    } satisfies ITodoAppMemberSession.ILogin,
  });
  // Step 3: Validate response structure
  typia.assert(loginResponse);
  // Step 4: Validate member information
  TestValidator.equals(
    "member email matches",
    loginResponse.member.email,
    registerEmail,
  );
  TestValidator.predicate("member has id", loginResponse.member.id.length > 0);
  TestValidator.predicate(
    "member has displayName",
    loginResponse.member.displayName.length > 0,
  );
  // Step 5: Validate access token structure
  TestValidator.predicate(
    "access_token exists",
    loginResponse.access_token.access_token.length > 0,
  );
  TestValidator.predicate(
    "refresh_token exists",
    loginResponse.refresh_token.refresh_token.length > 0,
  );
  TestValidator.predicate(
    "access_expires_at exists",
    loginResponse.access_token.access_expires_at.length > 0,
  );
  TestValidator.predicate(
    "refresh_expires_at exists",
    loginResponse.refresh_token.refresh_expires_at.length > 0,
  );
  // Step 6: Validate token expiration timestamps
  const now = new Date().toISOString();
  TestValidator.predicate(
    "access token not expired",
    loginResponse.access_token.access_expires_at > now,
  );
  TestValidator.predicate(
    "refresh token not expired",
    loginResponse.refresh_token.refresh_expires_at > now,
  );
  // Step 7: Validate token structure
  TestValidator.predicate(
    "token.access exists",
    loginResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "token.refresh exists",
    loginResponse.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token.expired_at exists",
    loginResponse.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "token.refreshable_until exists",
    loginResponse.token.refreshable_until.length > 0,
  );
  TestValidator.predicate(
    "token.refreshable_until in future",
    loginResponse.token.refreshable_until > now,
  );
}