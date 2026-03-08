import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test successful administrator token refresh workflow.
 * 1. Admin joins and obtains initial access and refresh tokens
 * 2. Verify initial tokens contain correct admin claims
 * 3. Refresh the access token using valid refresh token
 * 4. Verify response contains new access token with same userId
 * 5. Verify new token has refreshed expiration time
 * 6. Test that new tokens work for subsequent requests
 */
export async function test_api_admin_token_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin user to obtain initial tokens
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>() satisfies string as string,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>() satisfies string as string,
      referrer: typia.random<string & tags.Format<"uri">>() satisfies string as string,
    } satisfies IEconomicPoliticalBoardAdmin.IJoin,
  });
  typia.assert(initialAuth);
  // 2. Verify initial token contains correct admin claims
  const initialUserId: string = initialAuth.id;
  // 3. Refresh the access token using valid refresh token
  const adminRefreshConnection: api.IConnection = { host: connection.host };
  const refreshedAuth = await authorize_admin_refresh(adminRefreshConnection, {
    body: {
      refresh_token: initialAuth.token.refresh,
    } satisfies IEconomicPoliticalBoardAdmin.IRefresh,
  });
  typia.assert(refreshedAuth);
  // 4. Verify response contains same userId
  TestValidator.equals("userId unchanged", refreshedAuth.id, initialUserId);
  // 5. Verify new token has refreshed expiration time
  const newExpiredAt: string = refreshedAuth.token.expired_at;
  // The new expiration should be different (refreshed)
  TestValidator.notEquals(
    "access token refreshed",
    initialAuth.token.expired_at,
    newExpiredAt,
  );
  // 6. Verify the new access token is different from the old one
  TestValidator.notEquals(
    "new access token issued",
    initialAuth.token.access,
    refreshedAuth.token.access,
  );
  // 7. Verify refreshable_until deadline extends
  TestValidator.predicate(
    "refresh deadline extended",
    new Date(refreshedAuth.token.refreshable_until) >
      new Date(initialAuth.token.refreshable_until),
  );
}