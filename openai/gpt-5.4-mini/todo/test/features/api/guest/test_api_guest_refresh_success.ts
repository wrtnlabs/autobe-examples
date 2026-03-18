import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  const guestConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_guest_join(guestConnection, {
    body: {} satisfies ITodoAppGuest.IJoin,
  });
  typia.assert(joined);
  const refreshConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: joined.token.refresh,
    },
  };
  const refreshed = await authorize_guest_refresh(refreshConnection, {
    body: {} satisfies ITodoAppGuest.IRefresh,
  });
  typia.assert(refreshed);
  TestValidator.equals("guest id should be preserved", refreshed.id, joined.id);
  TestValidator.equals(
    "guest created_at should be preserved",
    refreshed.created_at,
    joined.created_at,
  );
  TestValidator.equals(
    "guest deleted_at should be preserved",
    refreshed.deleted_at,
    joined.deleted_at,
  );
  TestValidator.notEquals(
    "access token should be rotated",
    refreshed.token.access,
    joined.token.access,
  );
  TestValidator.notEquals(
    "access expiration should be refreshed",
    refreshed.token.expired_at,
    joined.token.expired_at,
  );
  TestValidator.notEquals(
    "refreshable deadline should be refreshed",
    refreshed.token.refreshable_until,
    joined.token.refreshable_until,
  );
}
