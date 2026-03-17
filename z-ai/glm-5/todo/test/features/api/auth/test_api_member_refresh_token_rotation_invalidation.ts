import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPrivateTodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_refresh_token_rotation_invalidation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and get initial tokens
  const memberConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_member_join(memberConnection, {});
  typia.assert(initialAuth);
  // 2. Store the initial refresh token
  const oldRefreshToken = initialAuth.token.refresh;
  // 3. Call refresh endpoint with the initial refresh_token
  const firstRefreshConnection: api.IConnection = { host: connection.host };
  const firstRefreshAuth = await authorize_member_refresh(
    firstRefreshConnection,
    {
      body: {
        refresh_token: oldRefreshToken,
      } satisfies IPrivateTodoAppMember.IRefresh,
    },
  );
  typia.assert(firstRefreshAuth);
  // 4. Store the new refresh_token
  const newRefreshToken = firstRefreshAuth.token.refresh;
  // Verify token rotation: new token should be different from old token
  TestValidator.notEquals(
    "refresh token should be rotated",
    newRefreshToken,
    oldRefreshToken,
  );
  // 5-6. Attempt to use the OLD refresh_token again (should fail)
  await TestValidator.error(
    "old refresh token should be invalidated after rotation",
    async () => {
      const oldTokenConnection: api.IConnection = { host: connection.host };
      await authorize_member_refresh(oldTokenConnection, {
        body: {
          refresh_token: oldRefreshToken,
        } satisfies IPrivateTodoAppMember.IRefresh,
      });
    },
  );
  // 7. Verify the new refresh_token works for subsequent refresh
  const secondRefreshConnection: api.IConnection = { host: connection.host };
  const secondRefreshAuth = await authorize_member_refresh(
    secondRefreshConnection,
    {
      body: {
        refresh_token: newRefreshToken,
      } satisfies IPrivateTodoAppMember.IRefresh,
    },
  );
  typia.assert(secondRefreshAuth);
  // Verify member identity is preserved across refreshes
  TestValidator.equals(
    "member id should remain same across refreshes",
    initialAuth.id,
    firstRefreshAuth.id,
  );
  TestValidator.equals(
    "member email should remain same across refreshes",
    initialAuth.email,
    firstRefreshAuth.email,
  );
}
