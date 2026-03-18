import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_refresh_successful_renewal(
  connection: api.IConnection,
): Promise<void> {
  const guestConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_guest_join(guestConnection, {
    body: {},
  });
  typia.assert(joined);
  const refreshedConnection: api.IConnection = { host: connection.host };
  refreshedConnection.headers = {
    Authorization: joined.token.access,
  };
  const refreshed = await authorize_guest_refresh(refreshedConnection, {
    body: {},
  });
  typia.assert(refreshed);
  TestValidator.equals(
    "guest identity should remain the same",
    refreshed.id,
    joined.id,
  );
  TestValidator.notEquals(
    "access token should be renewed",
    refreshed.token.access,
    joined.token.access,
  );
  TestValidator.notEquals(
    "refresh token should be renewed",
    refreshed.token.refresh,
    joined.token.refresh,
  );
  TestValidator.notEquals(
    "access expiration should be renewed",
    refreshed.token.expired_at,
    joined.token.expired_at,
  );
  TestValidator.notEquals(
    "refreshable deadline should be renewed or reissued",
    refreshed.token.refreshable_until,
    joined.token.refreshable_until,
  );
}
