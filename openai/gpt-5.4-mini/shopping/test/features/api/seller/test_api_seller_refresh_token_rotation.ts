import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_refresh_token_rotation(
  connection: api.IConnection,
): Promise<void> {
  const joinConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_seller_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: null,
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(joined);
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshed = await authorize_seller_refresh(refreshConnection, {
    body: {
      refreshToken: joined.token.refresh,
    } satisfies IMallPlatformSeller.IRefresh,
  });
  typia.assert(refreshed);
  TestValidator.equals(
    "seller id should remain the same",
    refreshed.id,
    joined.id,
  );
  TestValidator.equals(
    "seller email should remain the same",
    refreshed.email,
    joined.email,
  );
  TestValidator.equals(
    "seller status should remain the same",
    refreshed.status,
    joined.status,
  );
  TestValidator.equals(
    "rejection reason should remain the same",
    refreshed.rejectionReason,
    joined.rejectionReason,
  );
  TestValidator.equals(
    "createdAt should remain the same",
    refreshed.createdAt,
    joined.createdAt,
  );
  TestValidator.equals(
    "deletedAt should remain the same",
    refreshed.deletedAt,
    joined.deletedAt,
  );
  TestValidator.notEquals(
    "access token should rotate on refresh",
    refreshed.token.access,
    joined.token.access,
  );
  TestValidator.notEquals(
    "access expiration should be renewed",
    refreshed.token.expired_at,
    joined.token.expired_at,
  );
  TestValidator.notEquals(
    "refresh window should be renewed or reissued",
    refreshed.token.refreshable_until,
    joined.token.refreshable_until,
  );
  if (refreshed.token.refresh !== joined.token.refresh) {
    const reuseConnection: api.IConnection = { host: connection.host };
    await TestValidator.error(
      "old refresh token should not be reusable after rotation",
      async () => {
        await authorize_seller_refresh(reuseConnection, {
          body: {
            refreshToken: joined.token.refresh,
          } satisfies IMallPlatformSeller.IRefresh,
        });
      },
    );
  }
}
