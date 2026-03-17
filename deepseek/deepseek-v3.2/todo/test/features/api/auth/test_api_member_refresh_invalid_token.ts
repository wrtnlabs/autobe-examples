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
 * Test refresh with invalid or non-existent refresh token.
 * Create a member account via join to establish context.
 * Attempt refresh using malformed, tampered, or fictional refresh tokens.
 * Verify the system rejects invalid tokens with authentication errors,
 * preventing token replay attacks and ensuring only valid tokens can renew.
 */
export async function test_api_member_refresh_invalid_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account with utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {
    body: {
      // Generate random data without tagged types
      email: `test${Date.now()}${Math.floor(Math.random() * 1000)}@example.com`,
      password: `pass${Date.now()}${Math.floor(Math.random() * 1000)}`,
      display_name: `User${Date.now()}`,
      href: `https://example.com/page${Date.now()}`,
      referrer: `https://example.com/referrer${Date.now()}`,
      ip: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(authorizedMember);
  // Extract valid refresh token for manipulation
  const validRefreshToken = authorizedMember.token.refresh;
  // 2. Test malformed random string token
  await TestValidator.error("malformed token should be rejected", async () => {
    await api.functional.todoApp.auth.member.refresh(memberConnection, {
      body: {
        refresh_token: `malformed${Date.now()}${Math.random()}`,
      } satisfies ITodoAppMember.IRefresh,
    });
  });
  // 3. Test tampered token (reverse the token)
  const tamperedToken = validRefreshToken.split("").reverse().join("");
  await TestValidator.error("tampered token should be rejected", async () => {
    await api.functional.todoApp.auth.member.refresh(memberConnection, {
      body: {
        refresh_token: tamperedToken,
      } satisfies ITodoAppMember.IRefresh,
    });
  });
  // 4. Test fictional UUID-like token (nonexistent session)
  const fictionalToken = `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`.replace(
    /[xy]/g,
    (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    },
  );
  await TestValidator.error("fictional token should be rejected", async () => {
    await api.functional.todoApp.auth.member.refresh(memberConnection, {
      body: {
        refresh_token: fictionalToken,
      } satisfies ITodoAppMember.IRefresh,
    });
  });
  // 5. Test empty string token
  await TestValidator.error("empty token should be rejected", async () => {
    await api.functional.todoApp.auth.member.refresh(memberConnection, {
      body: {
        refresh_token: "",
      } satisfies ITodoAppMember.IRefresh,
    });
  });
  // 6. Verify valid token still works (control test)
  const refreshed = await api.functional.todoApp.auth.member.refresh(
    memberConnection,
    {
      body: {
        refresh_token: validRefreshToken,
      } satisfies ITodoAppMember.IRefresh,
    },
  );
  typia.assert(refreshed);
  TestValidator.equals(
    "member ID unchanged",
    refreshed.id,
    authorizedMember.id,
  );
  TestValidator.notEquals(
    "tokens should rotate",
    refreshed.token.refresh,
    validRefreshToken,
  );
}
