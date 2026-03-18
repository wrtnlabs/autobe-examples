import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_refresh_rejects_old_rotated_token(
  connection: api.IConnection,
): Promise<void> {
  // 1) Join as member to obtain refreshToken_old
  const joinConnection: api.IConnection = { host: connection.host };
  const authorizedOld: IShoppingMallMember.IAuthorized =
    await authorize_member_join(joinConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
      } satisfies IShoppingMallMember.IJoin,
    });
  typia.assert(authorizedOld);
  const refreshTokenOld: string = authorizedOld.token.refresh;
  // 2) Rotate tokens using refreshTokenOld
  const refreshConnection: api.IConnection = { host: connection.host };
  const authorizedNew: IShoppingMallMember.IAuthorized =
    await authorize_member_refresh(refreshConnection, {
      body: {
        refreshToken: refreshTokenOld,
      } satisfies IShoppingMallMember.IRefresh,
    });
  typia.assert(authorizedNew);
  TestValidator.notEquals(
    "refresh token should rotate",
    authorizedNew.token.refresh,
    refreshTokenOld,
  );
  // 3) Reuse old refresh token should be rejected (401)
  const reusedRefreshConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "refresh should reject old rotated refresh token",
    401,
    async () => {
      await authorize_member_refresh(reusedRefreshConnection, {
        body: {
          refreshToken: refreshTokenOld,
        } satisfies IShoppingMallMember.IRefresh,
      });
    },
  );
}
