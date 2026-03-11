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

export async function test_api_superadmin_refresh_sequential(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator account
  const joinConnection: api.IConnection = { host: connection.host };
  const initialAuth = await authorize_super_admin_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(initialAuth);
  // Store initial refresh token
  const firstRefreshToken = initialAuth.token.refresh;
  // Perform first refresh operation with fresh connection
  const firstRefreshConnection: api.IConnection = { host: connection.host };
  const firstRefreshAuth = await authorize_super_admin_refresh(
    firstRefreshConnection,
    {
      body: {
        refresh_token: firstRefreshToken,
      } satisfies IDiscussionBoardSuperAdmin.IRefresh,
    },
  );
  typia.assert(firstRefreshAuth);
  // Store second refresh token
  const secondRefreshToken = firstRefreshAuth.token.refresh;
  // Perform second refresh operation with fresh connection
  const secondRefreshConnection: api.IConnection = { host: connection.host };
  const secondRefreshAuth = await authorize_super_admin_refresh(
    secondRefreshConnection,
    {
      body: {
        refresh_token: secondRefreshToken,
      } satisfies IDiscussionBoardSuperAdmin.IRefresh,
    },
  );
  typia.assert(secondRefreshAuth);
  // Validate that super administrator identity remains consistent
  TestValidator.equals(
    "super admin ID should remain consistent",
    initialAuth.id,
    firstRefreshAuth.id,
  );
  TestValidator.equals(
    "super admin ID should remain consistent",
    firstRefreshAuth.id,
    secondRefreshAuth.id,
  );
  TestValidator.equals(
    "super admin email should remain consistent",
    initialAuth.email,
    secondRefreshAuth.email,
  );
  TestValidator.equals(
    "super admin grade should remain consistent",
    initialAuth.admin_grade,
    secondRefreshAuth.admin_grade,
  );
  // Validate that refresh tokens are properly rotated (new tokens generated each time)
  TestValidator.notEquals(
    "refresh tokens should be different after rotation",
    firstRefreshToken,
    secondRefreshToken,
  );
  TestValidator.notEquals(
    "refresh tokens should be different after second rotation",
    secondRefreshToken,
    secondRefreshAuth.token.refresh,
  );
  // Validate that access tokens are properly refreshed
  TestValidator.notEquals(
    "access tokens should be different after refresh",
    initialAuth.token.access,
    firstRefreshAuth.token.access,
  );
  TestValidator.notEquals(
    "access tokens should be different after second refresh",
    firstRefreshAuth.token.access,
    secondRefreshAuth.token.access,
  );
  // Validate token expiration timestamps are properly updated
  TestValidator.predicate(
    "refreshable_until should be in the future",
    new Date(secondRefreshAuth.token.refreshable_until) > new Date(),
  );
  TestValidator.predicate(
    "expired_at should be in the future",
    new Date(secondRefreshAuth.token.expired_at) > new Date(),
  );
  // Test that previous refresh token is invalidated
  await TestValidator.error(
    "previous refresh token should be invalidated",
    async () => {
      const errorConnection: api.IConnection = { host: connection.host };
      await authorize_super_admin_refresh(errorConnection, {
        body: {
          refresh_token: firstRefreshToken,
        } satisfies IDiscussionBoardSuperAdmin.IRefresh,
      });
    },
  );
}
