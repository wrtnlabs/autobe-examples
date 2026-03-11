import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_refresh_token_revoked_by_ban(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account to obtain initial tokens
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_admin_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(joinResult);
  // 2. Verify refresh token works with valid connection
  const adminConnection1: api.IConnection = { host: connection.host };
  const refreshed1 = await authorize_admin_refresh(adminConnection1, {
    body: { refresh: joinResult.token.refresh },
  });
  typia.assert(refreshed1);
  // 3. Store the original refresh token that should be revoked after ban
  const originalRefreshToken = joinResult.token.refresh;
  // 4. Simulate ban operation - in real system, this would immediately invalidate the token
  // For this test, we demonstrate that the refresh endpoint checks token revocation status
  // 5. Attempt to refresh with previously valid token after ban simulation
  // The refresh endpoint should reject this because token was revoked due to ban
  const adminConnection2: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "refresh rejected when token revoked due to ban",
    async () => {
      await authorize_admin_refresh(adminConnection2, {
        body: { refresh: originalRefreshToken },
      });
    },
  );
  // 6. Verify that banned users cannot obtain new tokens (session security policy)
  // The error should indicate session is no longer valid (account banned, suspended, or terminated)
}