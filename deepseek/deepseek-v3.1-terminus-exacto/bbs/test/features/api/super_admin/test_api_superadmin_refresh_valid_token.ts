import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_superadmin_refresh_valid_token(
  connection: api.IConnection,
): Promise<void> {
  // Create initial superAdmin connection and obtain authentication tokens via join
  const initialConnection: api.IConnection = { host: connection.host };
  const initialAuth = await api.functional.discussionBoard.auth.superAdmin.join(
    initialConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        privilege_level: "super_admin",
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  typia.assert(initialAuth);
  // Store initial token expiration timestamps for comparison
  const initialExpiredAt = initialAuth.token.expired_at;
  const initialRefreshableUntil = initialAuth.token.refreshable_until;
  // Create separate connection for refresh operation and call refresh endpoint
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedAuth =
    await api.functional.discussionBoard.auth.superAdmin.refresh(
      refreshConnection,
      {
        body: {
          refresh_token: initialAuth.token.refresh,
        } satisfies IDiscussionBoardSuperAdmin.IRefresh,
      },
    );
  typia.assert(refreshedAuth);
  // Validate that user session context remains consistent
  TestValidator.equals(
    "user ID remains same",
    refreshedAuth.id,
    initialAuth.id,
  );
  TestValidator.equals(
    "email remains same",
    refreshedAuth.email,
    initialAuth.email,
  );
  TestValidator.equals(
    "privilege level remains same",
    refreshedAuth.privilege_level,
    initialAuth.privilege_level,
  );
  // Validate that tokens have been refreshed with new expiration timestamps
  TestValidator.notEquals(
    "access token changed",
    refreshedAuth.token.access,
    initialAuth.token.access,
  );
  TestValidator.notEquals(
    "refresh token changed",
    refreshedAuth.token.refresh,
    initialAuth.token.refresh,
  );
  TestValidator.notEquals(
    "expired_at timestamp updated",
    refreshedAuth.token.expired_at,
    initialExpiredAt,
  );
  TestValidator.notEquals(
    "refreshable_until timestamp updated",
    refreshedAuth.token.refreshable_until,
    initialRefreshableUntil,
  );
  // Validate that new timestamps represent later times than original ones
  TestValidator.predicate(
    "new expired_at is later than initial",
    new Date(refreshedAuth.token.expired_at) > new Date(initialExpiredAt),
  );
  TestValidator.predicate(
    "new refreshable_until is later than initial",
    new Date(refreshedAuth.token.refreshable_until) >
      new Date(initialRefreshableUntil),
  );
}
