import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_refresh_session_renewal(
  connection: api.IConnection,
): Promise<void> {
  const customerJoinConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_customer_join(customerJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(joined);
  const customerRefreshConnection: api.IConnection = { host: connection.host };
  const refreshed = await authorize_customer_refresh(
    customerRefreshConnection,
    {
      body: {
        refresh: joined.token.refresh,
      } satisfies IShoppingMallCustomer.IRefresh,
    },
  );
  typia.assert(refreshed);
  TestValidator.equals(
    "same customer id after refresh",
    refreshed.id,
    joined.id,
  );
  TestValidator.equals(
    "same customer email after refresh",
    refreshed.email,
    joined.email,
  );
  TestValidator.equals(
    "customer remains unbanned after refresh",
    refreshed.banned_at,
    null,
  );
  TestValidator.equals(
    "customer remains active after refresh",
    refreshed.deleted_at,
    null,
  );
  TestValidator.notEquals(
    "refresh issues a new access token",
    refreshed.token.access,
    joined.token.access,
  );
  TestValidator.notEquals(
    "refresh issues a new refresh token",
    refreshed.token.refresh,
    joined.token.refresh,
  );
  TestValidator.predicate(
    "access token expiration is parseable",
    Number.isFinite(Date.parse(refreshed.token.expired_at)),
  );
  TestValidator.predicate(
    "refresh deadline is parseable",
    Number.isFinite(Date.parse(refreshed.token.refreshable_until)),
  );
  TestValidator.predicate(
    "refresh deadline is not earlier than access expiration",
    Date.parse(refreshed.token.refreshable_until) >=
      Date.parse(refreshed.token.expired_at),
  );
}
