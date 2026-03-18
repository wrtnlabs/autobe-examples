import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_refresh_replay_of_old_refresh_token_handled(
  connection: api.IConnection,
): Promise<void> {
  // 1) Create baseline admin + capture original refresh token
  const adminConnectionForJoin: api.IConnection = { host: connection.host };
  const joined = await authorize_admin_join(adminConnectionForJoin, {});
  typia.assert(joined);
  const adminId = joined.id;
  const adminEmail = joined.email;
  const originalRefreshToken = joined.token.refresh;

  // 2) First refresh using the original refresh token
  const adminConnectionForRefresh1: api.IConnection = {
    host: connection.host,
  };
  const refreshed1 = await authorize_admin_refresh(adminConnectionForRefresh1, {
    body: {
      refreshToken: typia.assert<null>(originalRefreshToken as unknown),
    },
  });
  typia.assert(refreshed1);

  // 3) Second refresh replay using the ORIGINAL refresh token again
  const adminConnectionForRefresh2: api.IConnection = {
    host: connection.host,
  };
  try {
    const refreshed2 = await authorize_admin_refresh(
      adminConnectionForRefresh2,
      {
        body: {
          refreshToken: typia.assert<null>(originalRefreshToken as unknown),
        },
      },
    );
    typia.assert(refreshed2);
    // If rotation is disabled (or old refresh token remains valid), identity must stay consistent.
    TestValidator.equals("admin id consistent", refreshed2.id, adminId);
    TestValidator.equals(
      "admin email consistent",
      refreshed2.email,
      adminEmail,
    );
  } catch (e) {
    // If rotation is enabled, replay must be rejected with 401.
    await TestValidator.httpError(
      "old refresh token replay should be unauthorized (401)",
      401,
      async () => {
        throw e;
      },
    );
  }
}
