import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceAdministrator.IJoin,
  });
  typia.assert(initialAuth);
  // Step 2: Refresh tokens using initial refresh token
  const refreshBody = {
    refresh_token: initialAuth.token.refresh,
  } satisfies IEcommerceAdministrator.IRefresh;
  const refreshedAuth = await authorize_administrator_refresh(adminConnection, {
    body: refreshBody,
  });
  typia.assert(refreshedAuth);
  // Step 3: Validate token rotation - old refresh token should no longer work
  await TestValidator.error("old refresh token should be invalid", async () => {
    await authorize_administrator_refresh(adminConnection, {
      body: refreshBody,
    });
  });
  // Step 4: Validate new tokens are different
  TestValidator.notEquals(
    "access token should change",
    initialAuth.token.access,
    refreshedAuth.token.access,
  );
  TestValidator.notEquals(
    "refresh token should change",
    initialAuth.token.refresh,
    refreshedAuth.token.refresh,
  );
  // Step 5: Validate administrator identity remains the same
  TestValidator.equals(
    "administrator ID unchanged",
    initialAuth.id,
    refreshedAuth.id,
  );
  TestValidator.equals(
    "administrator email unchanged",
    initialAuth.email,
    refreshedAuth.email,
  );
  // Step 6: Validate expiry timestamps are updated (new token should have later expiry)
  const initialExpiry = new Date(initialAuth.token.expired_at);
  const refreshedExpiry = new Date(refreshedAuth.token.expired_at);
  TestValidator.predicate(
    "new access token should have later expiry",
    refreshedExpiry > initialExpiry,
  );
  const initialRefreshable = new Date(initialAuth.token.refreshable_until);
  const refreshedRefreshable = new Date(refreshedAuth.token.refreshable_until);
  TestValidator.predicate(
    "new refresh token should have later expiry",
    refreshedRefreshable > initialRefreshable,
  );
}
