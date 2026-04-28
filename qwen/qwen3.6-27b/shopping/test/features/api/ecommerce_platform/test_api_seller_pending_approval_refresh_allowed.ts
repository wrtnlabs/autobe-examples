import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_pending_approval_refresh_allowed(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Initialize seller connection
  const sellerConnection: api.IConnection = { host: connection.host };
  // Step 2: Register seller to get initial tokens
  const joinResponse: IEcommercePlatformSeller.IAuthorized =
    await authorize_seller_join(sellerConnection, {
      body: {},
    });
  typia.assert(joinResponse);
  // Step 3: Extract initial refresh token
  const refreshToken: string = joinResponse.token.refresh;
  // Step 4: Perform token refresh
  const refreshResponse: IEcommercePlatformSeller.IAuthorized =
    await authorize_seller_refresh(sellerConnection, {
      body: { refreshToken },
    });
  typia.assert(refreshResponse);
  // Step 5: Verify token rotation logic
  TestValidator.notEquals(
    "refresh token updates after renewal",
    joinResponse.token.refresh,
    refreshResponse.token.refresh,
  );
  // Step 6: Verify new access token expiration is valid
  TestValidator.predicate(
    "new access token is not expired",
    refreshResponse.token.expired_at > new Date().toISOString(),
  );
}
