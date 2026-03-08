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

export async function test_api_member_refresh_invalid_token(
  connection: api.IConnection,
): Promise<void> {
  // Create member account to get valid refresh token
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ITodoAppMemberSession.IJoin,
  });
  typia.assert(member);
  // Store original refresh token before any refresh operations
  const originalRefreshToken = member.refresh_token;
  // Test 1: Non-existent token (valid UUID format but not in database)
  await TestValidator.error("should fail with non-existent token", async () => {
    const invalidConnection: api.IConnection = { host: connection.host };
    await authorize_member_refresh(invalidConnection, {
      body: {
        refresh_token: typia.random<string & tags.Format<"uuid">>(),
      } satisfies ITodoAppMemberSession.IRefresh,
    });
  });
  // Test 2: Use valid refresh token first to trigger rotation
  const refreshed = await authorize_member_refresh(memberConnection, {
    body: {
      refresh_token: originalRefreshToken,
    } satisfies ITodoAppMemberSession.IRefresh,
  });
  typia.assert(refreshed);
  // Test 3: Try to reuse the original token (should fail due to rotation)
  await TestValidator.error(
    "should fail when reusing rotated token",
    async () => {
      const reusedConnection: api.IConnection = { host: connection.host };
      await authorize_member_refresh(reusedConnection, {
        body: {
          refresh_token: originalRefreshToken,
        } satisfies ITodoAppMemberSession.IRefresh,
      });
    },
  );
  // Test 4: Tampered token (alter valid token to make it invalid)
  const tamperedToken =
    originalRefreshToken.length > 0
      ? originalRefreshToken.slice(0, -1) +
        (originalRefreshToken.at(-1) === "a" ? "b" : "a")
      : "00000000-0000-0000-0000-000000000000";
  await TestValidator.error("should fail with tampered token", async () => {
    const tamperedConnection: api.IConnection = { host: connection.host };
    await authorize_member_refresh(tamperedConnection, {
      body: {
        refresh_token: tamperedToken,
      } satisfies ITodoAppMemberSession.IRefresh,
    });
  });
}