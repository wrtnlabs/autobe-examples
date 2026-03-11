import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member login session establishment and token validity.
 *
 * This test validates the complete authentication flow:
 * 1. Register a new member account
 * 2. Login with registered credentials
 * 3. Verify updated_at timestamp reflects login activity
 * 4. Validate access and refresh tokens are issued
 * 5. Verify token expiration timestamps are valid
 */
export async function test_api_member_login_session_establishment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member account
  const joinEmail = typia.random<string & tags.Format<"email">>();
  const joinPassword = RandomGenerator.alphaNumeric(16);
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(joinConnection, {
    body: {
      email: joinEmail,
      password: joinPassword,
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(joinResult);
  // 2. Login with registered credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_member_login(loginConnection, {
    body: {
      email: joinEmail,
      password: joinPassword,
    } satisfies ITodoAppMember.ILogin,
  });
  typia.assert(loginResult);
  // 3. Verify member identity matches between join and login
  TestValidator.equals("member id matches", joinResult.id, loginResult.id);
  TestValidator.equals("email matches", joinResult.email, loginResult.email);
  TestValidator.equals(
    "display name matches",
    joinResult.display_name,
    loginResult.display_name,
  );
  // 4. Verify updated_at timestamp changed on login (login activity recorded)
  TestValidator.notEquals(
    "updated_at changed on login",
    joinResult.updated_at,
    loginResult.updated_at,
  );
  // 5. Verify access token is present and valid
  TestValidator.predicate(
    "access token exists",
    loginResult.token.access.length > 0,
  );
  // 6. Verify refresh token is present and valid
  TestValidator.predicate(
    "refresh token exists",
    loginResult.token.refresh.length > 0,
  );
  // 7. Verify token expiration timestamps are valid date-time strings
  TestValidator.predicate(
    "expired_at is valid",
    loginResult.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshable_until is valid",
    loginResult.token.refreshable_until.length > 0,
  );
  // 8. Verify refreshable_until is after or equal to expired_at
  const expiredAt = new Date(loginResult.token.expired_at);
  const refreshableUntil = new Date(loginResult.token.refreshable_until);
  TestValidator.predicate(
    "refreshable_until >= expired_at",
    refreshableUntil >= expiredAt,
  );
}
