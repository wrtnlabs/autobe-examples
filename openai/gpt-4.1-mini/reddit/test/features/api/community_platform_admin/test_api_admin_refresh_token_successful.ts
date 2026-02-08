import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_refresh_token_successful(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new admin user by calling the authorized admin join utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_admin_join(adminConnection, {
    body: {} satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(joined);
  // 2. Refresh the token using the refresh token from the join response
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshed = await authorize_admin_refresh(refreshConnection, {
    body: {
      refresh: joined.token.refresh,
    } satisfies ICommunityPlatformAdmin.IRefresh,
  });
  typia.assert(refreshed);
  // 3. Validate that the refreshed token object is valid and differs from the original
  TestValidator.predicate(
    "refresh token has new access token",
    refreshed.token.access !== joined.token.access,
  );
  TestValidator.predicate(
    "refresh token has new refresh token",
    refreshed.token.refresh !== joined.token.refresh,
  );
  // 4. Validate that expiration timestamps are valid ISO strings and later than now
  const now = new Date();
  TestValidator.predicate(
    "refreshed expired_at is valid ISO date",
    !isNaN(Date.parse(refreshed.token.expired_at)),
  );
  TestValidator.predicate(
    "refreshed refreshable_until is valid ISO date",
    !isNaN(Date.parse(refreshed.token.refreshable_until)),
  );
  TestValidator.predicate(
    "refreshed expired_at is in the future",
    new Date(refreshed.token.expired_at) > now,
  );
  TestValidator.predicate(
    "refreshed refreshable_until is in the future",
    new Date(refreshed.token.refreshable_until) > now,
  );
  // 5. Validate that the refreshed token profile remains consistent
  TestValidator.equals("refresh token preserves profile", refreshed, {
    token: {
      access: refreshed.token.access,
      refresh: refreshed.token.refresh,
      expired_at: refreshed.token.expired_at,
      refreshable_until: refreshed.token.refreshable_until,
    },
  });
}
