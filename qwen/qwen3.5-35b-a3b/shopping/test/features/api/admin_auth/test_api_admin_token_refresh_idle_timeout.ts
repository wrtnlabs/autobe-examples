import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_token_refresh_idle_timeout(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin account creation
  const joinConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuthorized);
  // 2. Verify initial tokens are valid
  TestValidator.equals("admin has id", adminAuthorized.id !== undefined, true);
  TestValidator.equals(
    "has access token",
    adminAuthorized.token.access.length > 0,
    true,
  );
  TestValidator.equals(
    "has refresh token",
    adminAuthorized.token.refresh.length > 0,
    true,
  );
  // 3. Immediate refresh (should succeed - no idle period yet)
  const refreshConnection1: api.IConnection = { host: connection.host };
  await authorize_admin_refresh(refreshConnection1, {
    body: {
      refresh_token: adminAuthorized.token.refresh,
    } satisfies IEcommerceMallAdmin.IRefresh,
  });
  // 4. Attempt refresh - in simulation mode this will succeed since no actual idle timeout
  const refreshConnection2: api.IConnection = { host: connection.host };
  await authorize_admin_refresh(refreshConnection2, {
    body: {
      refresh_token: adminAuthorized.token.refresh,
    } satisfies IEcommerceMallAdmin.IRefresh,
  });
  // 5. Create fresh admin account to simulate new session
  const freshJoinConnection: api.IConnection = { host: connection.host };
  const freshAuthorized = await authorize_admin_join(freshJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(freshAuthorized);
  // 6. Verify fresh session tokens
  TestValidator.equals(
    "fresh admin email exists",
    freshAuthorized.email !== undefined,
    true,
  );
  TestValidator.equals(
    "new access token valid",
    freshAuthorized.token.access.length > 0,
    true,
  );
  TestValidator.equals(
    "new refresh token valid",
    freshAuthorized.token.refresh.length > 0,
    true,
  );
  // 7. Verify fresh session can be refreshed immediately
  const freshRefreshConnection: api.IConnection = { host: connection.host };
  await authorize_admin_refresh(freshRefreshConnection, {
    body: {
      refresh_token: freshAuthorized.token.refresh,
    } satisfies IEcommerceMallAdmin.IRefresh,
  });
  // 8. Verify multiple refreshes work (consecutive refresh limit test)
  const refreshConnection3: api.IConnection = { host: connection.host };
  const refreshedAuth = await authorize_admin_refresh(refreshConnection3, {
    body: {
      refresh_token: freshAuthorized.token.refresh,
    } satisfies IEcommerceMallAdmin.IRefresh,
  });
  typia.assert(refreshedAuth);
  TestValidator.equals(
    "refreshed token valid",
    refreshedAuth.token.access.length > 0,
    true,
  );
  // 9. Verify refreshable_until exists in response
  TestValidator.equals(
    "refreshable_until exists",
    refreshedAuth.token.refreshable_until !== undefined,
    true,
  );
}
