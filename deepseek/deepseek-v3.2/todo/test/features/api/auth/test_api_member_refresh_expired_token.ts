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

export async function test_api_member_refresh_expired_token(
  connection: api.IConnection,
): Promise<void> {
  // Create member account via join to obtain initial tokens
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // Extract refresh token from initial authentication
  const validRefreshToken = authorized.token.refresh;
  // Test 1: Attempt refresh with completely random invalid token
  await TestValidator.error(
    "refresh with random token should fail",
    async () => {
      await api.functional.todoApp.auth.member.refresh(memberConnection, {
        body: {
          refresh_token: typia.random<string>(),
        } satisfies ITodoAppMember.IRefresh,
      });
    },
  );
  // Test 2: Attempt refresh with modified valid token (invalid signature)
  await TestValidator.error(
    "refresh with modified token should fail",
    async () => {
      // Modify token by changing last few characters
      const modifiedToken =
        validRefreshToken.slice(0, -5) + typia.random<string>().slice(0, 5);
      await api.functional.todoApp.auth.member.refresh(memberConnection, {
        body: {
          refresh_token: modifiedToken,
        } satisfies ITodoAppMember.IRefresh,
      });
    },
  );
  // Test 3: Attempt refresh with empty string token
  await TestValidator.error(
    "refresh with empty token should fail",
    async () => {
      await api.functional.todoApp.auth.member.refresh(memberConnection, {
        body: {
          refresh_token: "",
        } satisfies ITodoAppMember.IRefresh,
      });
    },
  );
  // Test 4: Verify valid refresh token works (positive test)
  const refreshed = await api.functional.todoApp.auth.member.refresh(
    memberConnection,
    {
      body: {
        refresh_token: validRefreshToken,
      } satisfies ITodoAppMember.IRefresh,
    },
  );
  typia.assert(refreshed);
  TestValidator.notEquals(
    "new access token should differ",
    authorized.token.access,
    refreshed.token.access,
  );
  TestValidator.notEquals(
    "new refresh token should differ",
    validRefreshToken,
    refreshed.token.refresh,
  );
  TestValidator.equals(
    "member ID should remain same",
    authorized.id,
    refreshed.id,
  );
  // Test 5: Attempt to reuse old refresh token after refresh (should fail)
  await TestValidator.error(
    "reusing old refresh token should fail",
    async () => {
      await api.functional.todoApp.auth.member.refresh(memberConnection, {
        body: {
          refresh_token: validRefreshToken, // Old token from before refresh
        } satisfies ITodoAppMember.IRefresh,
      });
    },
  );
}
