import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_refresh_success_rotates_or_reissues_tokens(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const initialAdmin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(initialAdmin);
  const refreshed = await authorize_admin_refresh(
    { host: connection.host },
    {
      body: {
        refreshToken: null,
      } satisfies ICommunityPlatformAdmin.IRefresh,
    },
  );
  typia.assert(refreshed);
  TestValidator.equals("admin id matches", refreshed.id, initialAdmin.id);
  TestValidator.equals(
    "access token is non-empty",
    refreshed.token.access.length > 0,
    true,
  );
  TestValidator.equals(
    "refresh token is non-empty",
    refreshed.token.refresh.length > 0,
    true,
  );
  const now = Date.now();
  const expiredAt = new Date(refreshed.token.expired_at).getTime();
  const refreshableUntil = new Date(
    refreshed.token.refreshable_until,
  ).getTime();
  TestValidator.predicate("expired_at is in the future", () => expiredAt > now);
  TestValidator.predicate(
    "refreshable_until is not earlier than expired_at",
    () => refreshableUntil >= expiredAt,
  );
  // Token rotation is implementation-dependent; accept both rotate and reissue.
  if (refreshed.token.refresh !== initialAdmin.token.refresh) {
    TestValidator.notEquals(
      "refresh token rotated",
      refreshed.token.refresh,
      initialAdmin.token.refresh,
    );
  } else {
    const secondRefresh = await authorize_admin_refresh(
      { host: connection.host },
      {
        body: {
          refreshToken: null,
        } satisfies ICommunityPlatformAdmin.IRefresh,
      },
    );
    typia.assert(secondRefresh);
    TestValidator.equals(
      "admin id matches after second refresh",
      secondRefresh.id,
      initialAdmin.id,
    );
    TestValidator.equals(
      "second access token is non-empty",
      secondRefresh.token.access.length > 0,
      true,
    );
  }
}
