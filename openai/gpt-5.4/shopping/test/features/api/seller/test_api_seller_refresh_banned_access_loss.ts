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

export async function test_api_seller_refresh_banned_access_loss(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(joined);
  const originalRefreshToken: string = joined.token.refresh;
  const originalAccessToken: string = joined.token.access;
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshed = await authorize_seller_refresh(refreshConnection, {
    body: {
      refresh: originalRefreshToken,
    } satisfies IShoppingMallSeller.IRefresh,
  });
  typia.assert(refreshed);
  TestValidator.equals(
    "seller id is preserved across refresh",
    refreshed.id,
    joined.id,
  );
  TestValidator.equals(
    "seller email is preserved across refresh",
    refreshed.email,
    joined.email,
  );
  TestValidator.equals(
    "approval status is preserved across refresh",
    refreshed.approval_status,
    joined.approval_status,
  );
  TestValidator.equals(
    "rejection reason is preserved across refresh",
    refreshed.rejection_reason,
    joined.rejection_reason,
  );
  TestValidator.equals(
    "suspended flag is preserved across refresh",
    refreshed.suspended,
    joined.suspended,
  );
  TestValidator.equals(
    "banned flag is preserved across refresh",
    refreshed.banned,
    joined.banned,
  );
  TestValidator.equals(
    "deleted_at is preserved across refresh",
    refreshed.deleted_at,
    joined.deleted_at,
  );
  TestValidator.notEquals(
    "access token is renewed on refresh",
    refreshed.token.access,
    originalAccessToken,
  );
  TestValidator.predicate(
    "refreshed refresh token is present",
    refreshed.token.refresh.length > 0,
  );
  TestValidator.equals(
    "refresh connection authorization header updated to refreshed access token",
    refreshConnection.headers?.Authorization,
    refreshed.token.access,
  );
}
