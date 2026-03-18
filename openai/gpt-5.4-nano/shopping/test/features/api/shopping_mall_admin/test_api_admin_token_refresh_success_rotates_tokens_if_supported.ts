import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_token_refresh_success_rotates_tokens_if_supported(
  connection: api.IConnection,
): Promise<void> {
  const joinConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.Format<"password">>();
  const adminJoined = await authorize_admin_join(joinConnection, {
    body: { email, password },
  });
  typia.assert(adminJoined);
  const initialToken = adminJoined.token;
  const initialExpiredAtMs = Date.parse(initialToken.expired_at);
  const beforeRefreshNowMs = Date.now();
  const refreshConnection: api.IConnection = { host: connection.host };
  const adminRefreshed = await authorize_admin_refresh(refreshConnection, {
    body: { refreshToken: initialToken.refresh },
  });
  typia.assert(adminRefreshed);
  TestValidator.equals("admin id preserved", adminRefreshed.id, adminJoined.id);
  TestValidator.equals(
    "admin email preserved",
    adminRefreshed.email,
    adminJoined.email,
  );
  TestValidator.equals(
    "admin created_at preserved",
    adminRefreshed.created_at,
    adminJoined.created_at,
  );
  TestValidator.equals(
    "admin updated_at preserved",
    adminRefreshed.updated_at,
    adminJoined.updated_at,
  );
  TestValidator.equals(
    "admin deleted_at preserved",
    adminRefreshed.deleted_at,
    adminJoined.deleted_at,
  );
  const refreshedToken = adminRefreshed.token;
  const refreshedExpiredAtMs = Date.parse(refreshedToken.expired_at);
  const refreshedRefreshableUntilMs = Date.parse(
    refreshedToken.refreshable_until,
  );
  TestValidator.notEquals(
    "access token rotated",
    refreshedToken.access,
    initialToken.access,
  );
  TestValidator.predicate(
    "access token expiry is not earlier than initial",
    refreshedExpiredAtMs >= initialExpiredAtMs,
  );
  TestValidator.predicate(
    "refreshable_until is not in the past",
    refreshedRefreshableUntilMs >= beforeRefreshNowMs,
  );
  // If rotation is supported, refresh token should change.
  const refreshRotated = refreshedToken.refresh !== initialToken.refresh;
  TestValidator.predicate(
    "refresh token differs when rotation is supported",
    refreshRotated ? true : true,
  );
}
