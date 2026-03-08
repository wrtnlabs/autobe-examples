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
  // Step 1: Create a new member account first using a separate connection
  const memberConnection: api.IConnection = { host: connection.host };
  const joinEmail = typia.random<string & tags.Format<"email">>();
  const joinPassword = RandomGenerator.alphaNumeric(16);
  const joinResponse = await api.functional.todoApp.auth.member.join(
    memberConnection,
    {
      body: {
        email: joinEmail,
        password: joinPassword,
      } satisfies ITodoAppMemberSession.IJoin,
    },
  );
  typia.assert(joinResponse);
  // Step 2: Login with the created credentials using a new connection
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResponse = await api.functional.todoApp.auth.member.login(
    loginConnection,
    {
      body: {
        email: joinEmail,
        password: joinPassword,
        href: "https://example.com/login",
        referrer: "https://example.com",
        ip: "127.0.0.1",
      } satisfies ITodoAppMemberSession.ILogin,
    },
  );
  typia.assert(loginResponse);
  // Step 3: Validate response structure
  TestValidator.equals(
    "should have access_token",
    typeof loginResponse.access_token,
    "string",
  );
  TestValidator.equals(
    "should have refresh_token",
    typeof loginResponse.refresh_token,
    "string",
  );
  TestValidator.predicate(
    "access_token should be non-empty",
    loginResponse.access_token.length > 0,
  );
  TestValidator.predicate(
    "refresh_token should be non-empty",
    loginResponse.refresh_token.length > 0,
  );
  // Step 4: Validate user information
  TestValidator.equals(
    "should have user info",
    loginResponse.user !== null && loginResponse.user !== undefined,
    true,
  );
  TestValidator.equals(
    "user should have member_id",
    typeof loginResponse.user.todo_app_member_id,
    "string",
  );
  // Step 5: Validate session metadata
  TestValidator.equals(
    "should have ip address",
    typeof loginResponse.ip,
    "string",
  );
  TestValidator.equals(
    "should have user_agent",
    typeof loginResponse.user_agent,
    "string",
  );
  // Step 6: Validate token expiration times
  const now = new Date().getTime();
  const accessExpiresAt = new Date(loginResponse.access_expires_at).getTime();
  const refreshExpiresAt = new Date(loginResponse.refresh_expires_at).getTime();
  TestValidator.predicate(
    "access_token should expire in reasonable time",
    accessExpiresAt > now + 15 * 60 * 1000,
  );
  TestValidator.predicate(
    "access_token should not expire too far",
    accessExpiresAt < now + 60 * 60 * 1000,
  );
  TestValidator.predicate(
    "refresh_token should expire in reasonable time",
    refreshExpiresAt > now + 24 * 60 * 60 * 1000,
  );
  TestValidator.predicate(
    "refresh_token should not expire too far",
    refreshExpiresAt < now + 30 * 24 * 60 * 60 * 1000,
  );
}
