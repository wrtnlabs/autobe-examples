import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";
import type { ITodoAppMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserLogin";
import type { ITodoAppMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberuser";

export async function test_api_member_user_login_success_existing_account(
  connection: api.IConnection,
) {
  // 1. Register a new member user with known credentials
  const joinRequestBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserJoin.IRequest;

  const joinedAuthorized: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinRequestBody,
    });
  typia.assert<ITodoAppMemberuser.IAuthorized>(joinedAuthorized);

  // 2. Create a guest connection (unauthenticated) without touching
  // the original connection.headers beyond what the SDK does.
  const guestConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 3. Perform login with the same email/password from unauthenticated guest
  const loginRequestBody = {
    email: joinRequestBody.email,
    password: joinRequestBody.password,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberUserLogin.IRequest;

  const loginAuthorized: ITodoAppMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(guestConnection, {
      body: loginRequestBody,
    });
  typia.assert<ITodoAppMemberuser.IAuthorized>(loginAuthorized);

  // 4. Basic equality checks between join and login responses
  TestValidator.equals(
    "member id must be equal between join and subsequent login",
    loginAuthorized.id,
    joinedAuthorized.id,
  );

  TestValidator.equals(
    "member email must be equal between join and subsequent login",
    loginAuthorized.email,
    joinedAuthorized.email,
  );

  // 5. Validate token structure and fields
  const token: IAuthorizationToken = loginAuthorized.token;
  typia.assert<IAuthorizationToken>(token);

  TestValidator.predicate(
    "access token string must be non-empty",
    token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token string must be non-empty",
    token.refresh.length > 0,
  );

  // expired_at and refreshable_until are validated as date-time by typia;
  // here we only ensure they are non-empty strings from business perspective.
  TestValidator.predicate(
    "expired_at must be a non-empty string",
    token.expired_at.length > 0,
  );

  TestValidator.predicate(
    "refreshable_until must be a non-empty string",
    token.refreshable_until.length > 0,
  );

  // Security-related assurances rely on the DTO design and typia.assert,
  // which guarantee that sensitive fields such as password or password_hash
  // are not present in ITodoAppMemberuser.IAuthorized.
}
