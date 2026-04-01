import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test successful member authentication with valid email and password credentials.
 *
 * This test verifies the complete member login workflow:
 * 1. Register a new member account with valid credentials
 * 2. Login with the same credentials
 * 3. Validate the response contains proper member ID and authorization tokens
 * 4. Verify token expiration timestamps are correctly ordered
 */
export async function test_api_member_login_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account credentials for login test
  const loginCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IMultiUserTodoMember.ILogin;
  // 2. Register a new member with the credentials
  const testMemberConnection: api.IConnection = { host: connection.host };
  const testMemberJoin = await authorize_member_join(testMemberConnection, {
    body: {
      email: loginCredentials.email,
      password: loginCredentials.password,
      href: loginCredentials.href,
      referrer: loginCredentials.referrer,
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(testMemberJoin);
  // 3. Login with the created member credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_member_login(loginConnection, {
    body: {
      email: loginCredentials.email,
      password: loginCredentials.password,
      href: loginCredentials.href,
      referrer: loginCredentials.referrer,
    } satisfies IMultiUserTodoMember.ILogin,
  });
  typia.assert(loginResult);
  // 4. Verify member ID matches registered account
  TestValidator.equals(
    "member ID matches registered account",
    loginResult.id,
    testMemberJoin.id,
  );
  // 5. Verify access token is non-empty string
  TestValidator.predicate(
    "access token is non-empty string",
    typeof loginResult.token.access === "string" &&
      loginResult.token.access.length > 0,
  );
  // 6. Verify refresh token is non-empty string
  TestValidator.predicate(
    "refresh token is non-empty string",
    typeof loginResult.token.refresh === "string" &&
      loginResult.token.refresh.length > 0,
  );
  // 7. Verify expired_at is valid date
  const expiredAt = new Date(loginResult.token.expired_at);
  TestValidator.predicate(
    "expired_at is valid date",
    !isNaN(expiredAt.getTime()),
  );
  // 8. Verify refreshable_until is valid date
  const refreshableUntil = new Date(loginResult.token.refreshable_until);
  TestValidator.predicate(
    "refreshable_until is valid date",
    !isNaN(refreshableUntil.getTime()),
  );
  // 9. Verify refreshable_until is after expired_at
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    refreshableUntil.getTime() > expiredAt.getTime(),
  );
  // 10. Verify expired_at is in the future
  const now = new Date();
  TestValidator.predicate(
    "expired_at is in the future",
    expiredAt.getTime() > now.getTime(),
  );
  // 11. Verify refreshable_until is in the future
  TestValidator.predicate(
    "refreshable_until is in the future",
    refreshableUntil.getTime() > now.getTime(),
  );
}
