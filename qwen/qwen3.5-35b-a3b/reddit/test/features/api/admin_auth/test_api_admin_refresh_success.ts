import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account to obtain initial refresh token
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(16),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph(),
      avatar_url: typia.random<string & tags.Format<"uri">>() ?? null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>() ?? null,
    } satisfies IRedditPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  // Store original refresh token for rotation validation
  const originalRefreshToken = admin.token.refresh;
  // 2. Refresh admin token
  const refreshedConnection: api.IConnection = { host: connection.host };
  const refreshedAdmin = await authorize_admin_refresh(refreshedConnection, {
    body: {
      refresh_token: originalRefreshToken,
    } satisfies IRedditPlatformAdmin.IRefresh,
  });
  typia.assert(refreshedAdmin);
  // 3. Validate token rotation occurred (new refresh token issued)
  TestValidator.notEquals(
    "refresh token rotated",
    originalRefreshToken,
    refreshedAdmin.token.refresh,
  );
  // 4. Validate access token changed (new token pair issued)
  TestValidator.notEquals(
    "access token renewed",
    admin.token.access,
    refreshedAdmin.token.access,
  );
  // 5. Validate expiration timestamps are set
  TestValidator.predicate(
    "access expired_at is set",
    refreshedAdmin.token.expired_at !== undefined,
  );
  TestValidator.predicate(
    "refreshable_until is set",
    refreshedAdmin.token.refreshable_until !== undefined,
  );
  // 6. Validate expired_at is within 2 hours (7200 seconds) from now
  const now = new Date();
  const expiredAt = new Date(refreshedAdmin.token.expired_at);
  const diffInSeconds = (expiredAt.getTime() - now.getTime()) / 1000;
  TestValidator.predicate(
    "access token expires within 2 hours",
    diffInSeconds > 0 && diffInSeconds <= 7200,
  );
  // 7. Validate refreshable_until is after expired_at
  const refreshableUntil = new Date(refreshedAdmin.token.refreshable_until);
  TestValidator.predicate(
    "refreshable_until is after access expiration",
    refreshableUntil.getTime() >= expiredAt.getTime(),
  );
  // 8. Validate admin profile is included in response
  TestValidator.equals(
    "admin email in refresh response",
    refreshedAdmin.email,
    admin.email,
  );
  TestValidator.equals(
    "admin username in refresh response",
    refreshedAdmin.username,
    admin.username,
  );
  TestValidator.equals(
    "admin display_name in refresh response",
    refreshedAdmin.display_name,
    admin.display_name,
  );
  TestValidator.equals(
    "admin id unchanged in refresh response",
    refreshedAdmin.id,
    admin.id,
  );
}
