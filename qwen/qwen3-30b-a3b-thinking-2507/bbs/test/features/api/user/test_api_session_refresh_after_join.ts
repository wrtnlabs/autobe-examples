import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomyPoliticsBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_session_refresh_after_join(
  connection: api.IConnection,
): Promise<void> {
  // Create user via join operation
  const userConnection: api.IConnection = { host: connection.host };
  const authResult: IEconomyPoliticsBoardUser.IAuthorized =
    await authorize_user_join(userConnection, {
      body: {} as IEconomyPoliticsBoardUser.IJoin,
    });
  typia.assert(authResult);
  // Extract refresh token from initial authentication
  const currentRefreshToken: string = authResult.token.refresh;
  // Refresh session using the refresh token
  const newAuthResult: IEconomyPoliticsBoardUser.IAuthorized =
    await authorize_user_refresh(userConnection, {
      body: {
        refresh_token: currentRefreshToken,
      } satisfies IEconomyPoliticsBoardUser.IRefresh,
    });
  typia.assert(newAuthResult);
  // Verify token rotation - new refresh token must be different
  TestValidator.notEquals(
    "New refresh token must be different from old one",
    currentRefreshToken,
    newAuthResult.token.refresh,
  );
}
