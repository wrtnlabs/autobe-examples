import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Create a new super admin account first using the join endpoint
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResponse =
    await api.functional.discussionBoard.auth.super_admin.join(joinConnection, {
      body: typia.random<IDiscussionBoardSuperAdmin.IJoin>(),
    });
  typia.assert(joinResponse);
  // Login with the created super admin credentials using utility function
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResponse = await authorize_super_admin_login(loginConnection, {
    body: typia.random<IDiscussionBoardSuperAdmin.ILogin>(),
  });
  typia.assert(loginResponse);
  // Validate token structure
  TestValidator.equals(
    "access token exists",
    loginResponse.token.access.length > 0,
    true,
  );
  TestValidator.equals(
    "refresh token exists",
    loginResponse.token.refresh.length > 0,
    true,
  );
  TestValidator.predicate(
    "expired_at is valid ISO date",
    () => !isNaN(Date.parse(loginResponse.token.expired_at)),
  );
  TestValidator.predicate(
    "refreshable_until is valid ISO date",
    () => !isNaN(Date.parse(loginResponse.token.refreshable_until)),
  );
  // Verify tokens are different
  TestValidator.notEquals(
    "access and refresh tokens are different",
    loginResponse.token.access,
    loginResponse.token.refresh,
  );
  // Verify expiration times are in the future
  const now = new Date();
  const expiredAt = new Date(loginResponse.token.expired_at);
  const refreshableUntil = new Date(loginResponse.token.refreshable_until);
  TestValidator.predicate("expired_at is in the future", () => expiredAt > now);
  TestValidator.predicate(
    "refreshable_until is in the future",
    () => refreshableUntil > now,
  );
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    () => refreshableUntil >= expiredAt,
  );
}
