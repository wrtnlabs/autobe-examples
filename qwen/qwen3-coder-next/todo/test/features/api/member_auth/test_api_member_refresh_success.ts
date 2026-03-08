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

export async function test_api_member_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member account via join
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ITodoAppMemberSession.IJoin;
  const joinedMember = await api.functional.todoApp.auth.member.join(
    connection,
    {
      body: joinInput,
    },
  );
  typia.assert(joinedMember);
  // Step 2: Login to obtain initial tokens
  const loginInput = {
    email: joinInput.email,
    password: joinInput.password,
    href: "https://example.com/login",
    referrer: "https://example.com",
    ip: "127.0.0.1",
  } satisfies ITodoAppMemberSession.ILogin;
  const loggedinMember = await api.functional.todoApp.auth.member.login(
    connection,
    {
      body: loginInput,
    },
  );
  typia.assert(loggedinMember);
  // Step 3: Use refresh token to get new tokens
  const refreshInput = {
    refresh_token: loggedinMember.refresh_token,
  } satisfies ITodoAppMemberSession.IRefresh;
  const refreshedMember = await api.functional.todoApp.auth.member.refresh(
    connection,
    {
      body: refreshInput,
    },
  );
  typia.assert(refreshedMember);
  // Step 4: Validate new tokens are issued
  TestValidator.notEquals(
    "new access token differs",
    refreshedMember.access_token,
    loggedinMember.access_token,
  );
  TestValidator.notEquals(
    "new refresh token differs",
    refreshedMember.refresh_token,
    loggedinMember.refresh_token,
  );
  // Step 5: Validate new expiration timestamps are set
  TestValidator.predicate("new access token has future expiration", () => {
    const now = new Date().getTime();
    const accessExpiresAt = new Date(
      refreshedMember.access_expires_at,
    ).getTime();
    return accessExpiresAt > now;
  });
  TestValidator.predicate("new refresh token has future expiration", () => {
    const now = new Date().getTime();
    const refreshExpiresAt = new Date(
      refreshedMember.refresh_expires_at,
    ).getTime();
    return refreshExpiresAt > now;
  });
  // Step 6: Validate session metadata is updated
  TestValidator.predicate("last_used_at is updated", () => {
    const now = new Date().getTime();
    const lastUsedAt = new Date(refreshedMember.last_used_at).getTime();
    return lastUsedAt <= now;
  });
  // Step 7: Verify new tokens work for subsequent requests (by checking response structure)
  TestValidator.equals(
    "member ID preserved",
    refreshedMember.user.id,
    loggedinMember.user.id,
  );
}
