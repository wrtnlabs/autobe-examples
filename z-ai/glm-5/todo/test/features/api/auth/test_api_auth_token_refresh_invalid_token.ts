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
 * Test that token refresh is rejected when an invalid, malformed, or
 * non-existent refresh token is provided.
 *
 * This security validation test verifies that the authentication system
 * properly rejects refresh requests with various types of invalid tokens
 * without revealing internal state or session information.
 */
export async function test_api_auth_token_refresh_invalid_token(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Malformed token - not a valid JWT format
  await TestValidator.error("malformed token should be rejected", async () => {
    await api.functional.todoApp.auth.member.refresh(connection, {
      body: {
        refreshToken: "not-a-valid-jwt-token",
      } satisfies ITodoAppMember.IRefresh,
    });
  });
  // Scenario 2: Empty string token
  await TestValidator.error("empty token should be rejected", async () => {
    await api.functional.todoApp.auth.member.refresh(connection, {
      body: { refreshToken: "" } satisfies ITodoAppMember.IRefresh,
    });
  });
  // Scenario 3: JWT-like string with invalid parts count (not 3 segments)
  await TestValidator.error(
    "invalid JWT format should be rejected",
    async () => {
      await api.functional.todoApp.auth.member.refresh(connection, {
        body: { refreshToken: "a.b.c.d" } satisfies ITodoAppMember.IRefresh,
      });
    },
  );
  // Scenario 4: Properly formatted but fake JWT with non-existent session
  // This is a valid-looking JWT that doesn't correspond to any session in the database
  const fakeJwt =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJub24tZXhpc3RlbnQtc2Vzc2lvbi1pZCIsImV4cCI6OTk5OTk5OTk5OX0.ZmFrZXNpZ25hdHVyZQ";
  await TestValidator.error(
    "fake JWT with non-existent session should be rejected",
    async () => {
      await api.functional.todoApp.auth.member.refresh(connection, {
        body: { refreshToken: fakeJwt } satisfies ITodoAppMember.IRefresh,
      });
    },
  );
  // Scenario 5: JWT with expired exp claim (timestamp in the past)
  const expiredJwt =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJleHBpcmVkLXNlc3Npb24iLCJleHAiOjF9.ZmFrZXNpZ25hdHVyZQ";
  await TestValidator.error("expired JWT should be rejected", async () => {
    await api.functional.todoApp.auth.member.refresh(connection, {
      body: { refreshToken: expiredJwt } satisfies ITodoAppMember.IRefresh,
    });
  });
}
