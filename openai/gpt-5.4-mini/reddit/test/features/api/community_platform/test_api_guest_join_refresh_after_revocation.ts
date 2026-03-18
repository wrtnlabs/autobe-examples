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

export async function test_api_guest_join_refresh_after_revocation(
  connection: api.IConnection,
): Promise<void> {
  const guestConnection: api.IConnection = { host: connection.host };
  const first = await authorize_guest_join(guestConnection, { body: {} });
  typia.assert(first);
  const refreshedConnection: api.IConnection = { host: connection.host };
  const second = await authorize_guest_join(refreshedConnection, { body: {} });
  typia.assert(second);
  TestValidator.notEquals(
    "guest principal should be renewed",
    first.id,
    second.id,
  );
  TestValidator.notEquals(
    "access token should be refreshed",
    first.token.access,
    second.token.access,
  );
  TestValidator.notEquals(
    "refresh token should be refreshed",
    first.token.refresh,
    second.token.refresh,
  );
  TestValidator.notEquals(
    "access expiration should be refreshed",
    first.token.expired_at,
    second.token.expired_at,
  );
  TestValidator.notEquals(
    "refresh window should be refreshed",
    first.token.refreshable_until,
    second.token.refreshable_until,
  );
}
