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

export async function test_api_member_login_with_correct_credentials(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new member account with valid credentials using utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const registered = await authorize_member_join(memberConnection, {});
  // 2. Call login with correct credentials
  const loginResponse = await api.functional.multiUserTodo.auth.member.login(
    memberConnection,
    {
      body: {
        email: registered.email,
        password: registered.email.split("@")[0], // password matches email prefix from join
        href: "https://example.com/login",
        referrer: "https://example.com/",
      } satisfies IMultiUserTodoMember.ILogin,
    },
  );
  // 3. Validate the response
  typia.assert(loginResponse);
  // 4. Validate member details match registration
  TestValidator.equals(
    "member id is UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      loginResponse.id,
    ),
    true,
  );
  TestValidator.equals(
    "email matches registered",
    loginResponse.email,
    registered.email,
  );
  TestValidator.equals(
    "display_name matches registered",
    loginResponse.display_name,
    registered.display_name,
  );
  TestValidator.predicate("created_at exists", !!loginResponse.created_at);
  TestValidator.predicate("updated_at exists", !!loginResponse.updated_at);
  // 5. Validate token structure
  TestValidator.predicate(
    "access token is non-empty string",
    typeof loginResponse.token.access === "string" &&
      loginResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty string",
    typeof loginResponse.token.refresh === "string" &&
      loginResponse.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at exists",
    !!loginResponse.token.expired_at,
  );
  TestValidator.predicate(
    "refreshable_until exists",
    !!loginResponse.token.refreshable_until,
  );
  // 6. Validate access token is JWT format (xxx.yyy.zzz)
  const tokenParts = loginResponse.token.access.split(".");
  TestValidator.equals("JWT has 3 parts", tokenParts.length, 3);
  // 7. Validate expiration times are in the future
  const now = new Date();
  const expiredAt = new Date(loginResponse.token.expired_at);
  const refreshableUntil = new Date(loginResponse.token.refreshable_until);
  TestValidator.predicate("expired_at is in the future", expiredAt > now);
  TestValidator.predicate(
    "refreshable_until is in the future",
    refreshableUntil > now,
  );
  // 8. Decode JWT payload and verify claims
  const payload = JSON.parse(atob(tokenParts[1]));
  TestValidator.equals(
    "JWT sub matches member id",
    payload.sub,
    loginResponse.id,
  );
  TestValidator.predicate(
    "JWT exp matches expired_at",
    Math.floor(expiredAt.getTime() / 1000) === payload.exp,
  );
}
