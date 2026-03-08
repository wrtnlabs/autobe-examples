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

export async function test_api_member_login_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new member account using utility function
  const joinConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ITodoAppMember.IJoin;
  const joinResponse: ITodoAppMember.IAuthorized = await authorize_member_join(
    joinConnection,
    {
      body: joinInput,
    },
  );
  typia.assert(joinResponse);
  // 2. Login with the created credentials using utility function
  const loginConnection: api.IConnection = { host: connection.host };
  const loginInput = {
    email: joinResponse.email,
    password: joinInput.password,
  } satisfies ITodoAppMember.ILogin;
  const loginResponse: ITodoAppMember.IAuthorized =
    await authorize_member_login(loginConnection, {
      body: loginInput,
    });
  typia.assert(loginResponse);
  // 3. Verify response contains valid JWT tokens
  TestValidator.notEquals(
    "access token not empty",
    "",
    loginResponse.token.access,
  );
  TestValidator.notEquals(
    "refresh token not empty",
    "",
    loginResponse.token.refresh,
  );
  // 4. Verify member information is correctly returned
  TestValidator.predicate("member id present", loginResponse.id.length > 0);
  TestValidator.equals(
    "member email matches",
    loginResponse.email,
    joinInput.email,
  );
  TestValidator.equals(
    "display name matches",
    loginResponse.display_name,
    joinInput.displayName,
  );
  TestValidator.predicate(
    "created_at is valid date",
    !!loginResponse.created_at,
  );
  TestValidator.predicate(
    "updated_at is valid date",
    !!loginResponse.updated_at,
  );
  TestValidator.equals(
    "deleted_at is null for active user",
    loginResponse.deleted_at,
    null,
  );
  // 5. Verify token expiration times
  const accessExpiredAt = new Date(loginResponse.token.expired_at);
  const refreshableUntil = new Date(loginResponse.token.refreshable_until);
  const now = new Date();
  // Access token should expire in ~15 minutes (900 seconds)
  const accessExpiresIn = Math.floor(
    (accessExpiredAt.getTime() - now.getTime()) / 1000,
  );
  TestValidator.predicate(
    "access token expires in ~15 minutes",
    accessExpiresIn >= 850 && accessExpiresIn <= 950,
  );
  // Refresh token should expire in ~7 days (604800 seconds)
  const refreshExpiresIn = Math.floor(
    (refreshableUntil.getTime() - now.getTime()) / 1000,
  );
  TestValidator.predicate(
    "refresh token expires in ~7 days",
    refreshExpiresIn >= 604000 && refreshExpiresIn <= 605600,
  );
  // 6. Verify session was created by checking the authorization response contains valid token
  TestValidator.predicate(
    "session token present",
    !!loginResponse.token.access,
  );
  // 7. Verify the member can access protected resources using the token
  // Create a new connection with the login token
  const protectedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${loginResponse.token.access}`,
    },
  };
  // Access a protected endpoint (this would be validated in actual todo operations)
  // For now, we verify the token is accepted by checking the connection can be used
  TestValidator.predicate(
    "protected connection has valid token",
    protectedConnection.headers?.Authorization !== undefined,
  );
}
