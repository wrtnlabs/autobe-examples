import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_refresh_session_renewal(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>() as string &
      tags.MinLength<1> &
      tags.Format<"password">,
  } satisfies IShoppingMallSeller.IJoin;
  const joined = await authorize_seller_join(sellerConnection, {
    body: joinBody,
  });
  typia.assert(joined);
  const originalSellerId = joined.id;
  const originalEmail = joined.email;
  const originalAccess = joined.token.access;
  const originalRefresh = joined.token.refresh;
  const originalExpiredAt = joined.token.expired_at;
  const originalRefreshableUntil = joined.token.refreshable_until;
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshed = await authorize_seller_refresh(refreshConnection, {
    body: {
      refresh_token: originalRefresh,
    } satisfies IShoppingMallSeller.IRefresh,
  });
  typia.assert(refreshed);
  TestValidator.equals(
    "seller id should remain the same after refresh",
    refreshed.id,
    originalSellerId,
  );
  TestValidator.equals(
    "seller email should remain the same after refresh",
    refreshed.email,
    originalEmail,
  );
  TestValidator.equals(
    "approval status should remain unchanged",
    refreshed.approvalStatus,
    joined.approvalStatus,
  );
  TestValidator.equals(
    "account status should remain unchanged",
    refreshed.accountStatus,
    joined.accountStatus,
  );
  TestValidator.notEquals(
    "access token should be rotated on refresh",
    refreshed.token.access,
    originalAccess,
  );
  TestValidator.notEquals(
    "refresh token should be renewed on refresh",
    refreshed.token.refresh,
    originalRefresh,
  );
  TestValidator.notEquals(
    "expired_at should be refreshed",
    refreshed.token.expired_at,
    originalExpiredAt,
  );
  TestValidator.notEquals(
    "refreshable_until should be refreshed",
    refreshed.token.refreshable_until,
    originalRefreshableUntil,
  );
  const renewedConnection: api.IConnection = { host: connection.host };
  renewedConnection.headers = {
    Authorization: `Bearer ${refreshed.token.access}`,
  };
  const renewedAgain = await authorize_seller_refresh(renewedConnection, {
    body: {
      refresh_token: refreshed.token.refresh,
    } satisfies IShoppingMallSeller.IRefresh,
  });
  typia.assert(renewedAgain);
  TestValidator.equals(
    "second refresh should keep the same seller id",
    renewedAgain.id,
    originalSellerId,
  );
  TestValidator.equals(
    "second refresh should keep the same email",
    renewedAgain.email,
    originalEmail,
  );
  TestValidator.predicate(
    "second refresh should issue a usable access token",
    renewedAgain.token.access.length > 0,
  );
}
