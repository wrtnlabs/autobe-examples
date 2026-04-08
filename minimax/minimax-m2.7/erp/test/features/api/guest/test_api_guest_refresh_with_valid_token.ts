import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_refresh_with_valid_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new guest account to obtain valid refresh_token
  const authorized = await authorize_guest_join(connection, {});
  typia.assert(authorized);
  const originalAccessToken = authorized.token.access;
  const originalRefreshToken = authorized.token.refresh;
  // 2. Call refresh endpoint with valid refresh_token
  const refreshed = await authorize_guest_refresh(connection, {
    body: {
      refresh_token: originalRefreshToken,
    } satisfies IErpHrmGuest.IRefresh,
  });
  typia.assert(refreshed);
  // 3. Validate new tokens are different from original
  TestValidator.notEquals(
    "new access_token should be different",
    originalAccessToken,
    refreshed.token.access,
  );
  TestValidator.notEquals(
    "new refresh_token should be different",
    originalRefreshToken,
    refreshed.token.refresh,
  );
  // 4. Validate expired_at is in the future
  const expiredAt = new Date(refreshed.token.expired_at);
  TestValidator.predicate(
    "expired_at should be in the future",
    expiredAt.getTime() > Date.now(),
  );
}
