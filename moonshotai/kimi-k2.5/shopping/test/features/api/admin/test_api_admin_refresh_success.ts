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

/**
 * Test successful token refresh for an active administrator.
 * 1. Register a new administrator to obtain initial access and refresh tokens
 * 2. Call the refresh endpoint with the valid refresh token
 * 3. Verify the response contains new access token with later expiration
 * 4. Verify administrator profile data is complete and correct
 */
export async function test_api_admin_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register new administrator to get initial tokens
  const adminConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"url">>(),
      referrer: typia.random<string & tags.Format<"url">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(initialAuth);
  const originalExpiredAt = new Date(initialAuth.token.expired_at).getTime();
  // Step 2: Refresh token using valid refresh token
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedAuth = await authorize_admin_refresh(refreshConnection, {
    body: {
      refresh: initialAuth.token.refresh,
    } satisfies IEcommerceMallAdmin.IRefresh,
  });
  typia.assert(refreshedAuth);
  // Step 3: Validate administrator profile data
  TestValidator.equals("admin id matches", refreshedAuth.id, initialAuth.id);
  TestValidator.equals("email matches", refreshedAuth.email, initialAuth.email);
  TestValidator.equals("grade is regular", refreshedAuth.grade, "regular");
  TestValidator.equals("status is active", refreshedAuth.status, "active");
  TestValidator.equals(
    "created_at matches",
    refreshedAuth.created_at,
    initialAuth.created_at,
  );
  // Step 4: Validate new access token has later expiration
  const newExpiredAt = new Date(refreshedAuth.token.expired_at).getTime();
  TestValidator.predicate(
    "new access token has later expiration",
    newExpiredAt > originalExpiredAt,
  );
  // Step 5: Validate token structure
  TestValidator.predicate(
    "access token is non-empty",
    refreshedAuth.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    refreshedAuth.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "refreshable_until is future date",
    new Date(refreshedAuth.token.refreshable_until).getTime() > Date.now(),
  );
}
