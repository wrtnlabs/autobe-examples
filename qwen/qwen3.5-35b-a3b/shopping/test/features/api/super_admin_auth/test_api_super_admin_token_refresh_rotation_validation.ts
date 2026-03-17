import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_token_refresh_rotation_validation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register super administrator
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_super_admin_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IEcommerceMallSuperAdmin.IJoin,
  });
  typia.assert(joinResponse);
  // Store initial refresh token
  const initialRefreshToken = joinResponse.refresh;
  // Step 2: Perform first refresh to get rotated tokens
  const refresh1Connection: api.IConnection = { host: connection.host };
  const refresh1Response = await authorize_super_admin_refresh(
    refresh1Connection,
    {
      body: {
        refresh_token: initialRefreshToken,
      } satisfies IEcommerceMallSuperAdmin.IRefresh,
    },
  );
  typia.assert(refresh1Response);
  // Store new refresh token from first refresh
  const newRefreshToken = refresh1Response.refresh;
  // Step 3: Attempt to use OLD refresh token - should be rejected
  const invalidationConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "old refresh token should be rejected after rotation",
    async () => {
      await authorize_super_admin_refresh(invalidationConnection, {
        body: {
          refresh_token: initialRefreshToken,
        } satisfies IEcommerceMallSuperAdmin.IRefresh,
      });
    },
  );
  // Step 4: Use new refresh token - should succeed
  const validRefreshConnection: api.IConnection = { host: connection.host };
  const refresh2Response = await authorize_super_admin_refresh(
    validRefreshConnection,
    {
      body: {
        refresh_token: newRefreshToken,
      } satisfies IEcommerceMallSuperAdmin.IRefresh,
    },
  );
  typia.assert(refresh2Response);
  // Verify that new tokens were issued
  TestValidator.notEquals(
    "new access token should differ",
    refresh1Response.token.access,
    refresh2Response.token.access,
  );
  TestValidator.notEquals(
    "new refresh token should differ",
    refresh1Response.refresh,
    refresh2Response.refresh,
  );
}
