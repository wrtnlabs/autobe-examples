import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";

export async function test_api_owner_refresh_authorized_session_renewal(
  connection: api.IConnection,
): Promise<void> {
  const ownerJoinConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IHrmTimeTrackingOwner.IJoin;
  const joined: IHrmTimeTrackingOwner.IAuthorized = await authorize_owner_join(
    ownerJoinConnection,
    {
      body: joinInput,
    },
  );
  typia.assert(joined);
  const ownerRefreshConnection: api.IConnection = { host: connection.host };
  const refreshInput = {
    refresh: joined.token.refresh,
  } satisfies IHrmTimeTrackingOwner.IRefresh;
  const refreshed: IHrmTimeTrackingOwner.IAuthorized =
    await authorize_owner_refresh(ownerRefreshConnection, {
      body: refreshInput,
    });
  typia.assert(refreshed);
  TestValidator.equals("same owner id after refresh", refreshed.id, joined.id);
  TestValidator.equals(
    "same owner email after refresh",
    refreshed.email,
    joined.email,
  );
  TestValidator.equals(
    "created_at remains same owner record",
    refreshed.created_at,
    joined.created_at,
  );
  TestValidator.equals(
    "updated_at remains same owner record",
    refreshed.updated_at,
    joined.updated_at,
  );
  TestValidator.equals(
    "deleted_at remains same owner record",
    refreshed.deleted_at,
    joined.deleted_at,
  );
  TestValidator.equals(
    "deactivated_at remains same owner record",
    refreshed.deactivated_at,
    joined.deactivated_at,
  );
  TestValidator.equals(
    "last_login_at remains same owner identity",
    refreshed.last_login_at,
    joined.last_login_at,
  );
  TestValidator.notEquals(
    "access token is newly issued",
    refreshed.token.access,
    joined.token.access,
  );
  TestValidator.notEquals(
    "refresh token is newly issued",
    refreshed.token.refresh,
    joined.token.refresh,
  );
  TestValidator.notEquals(
    "access token expiration is renewed",
    refreshed.token.expired_at,
    joined.token.expired_at,
  );
  TestValidator.notEquals(
    "refreshable deadline is renewed",
    refreshed.token.refreshable_until,
    joined.token.refreshable_until,
  );
}
