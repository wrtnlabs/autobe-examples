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

export async function test_api_admin_refresh_session_renewal(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password"> & tags.MinLength<1>>(),
  } satisfies ICommunityPlatformAdmin.IJoin;
  const authorizedBefore = await authorize_admin_join(adminConnection, {
    body: joinBody,
  });
  typia.assert(authorizedBefore);
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshed = await authorize_admin_refresh(refreshConnection, {
    body: {
      refreshToken: authorizedBefore.token.refresh,
    } satisfies ICommunityPlatformAdmin.IRefresh,
  });
  typia.assert(refreshed);
  TestValidator.equals("admin id preserved", refreshed.id, authorizedBefore.id);
  TestValidator.equals(
    "admin email preserved",
    refreshed.email,
    authorizedBefore.email,
  );
  TestValidator.predicate(
    "access token changed after refresh",
    refreshed.token.access !== authorizedBefore.token.access,
  );
  TestValidator.predicate(
    "refresh token changed after refresh",
    refreshed.token.refresh !== authorizedBefore.token.refresh,
  );
  TestValidator.predicate(
    "access expiration moved forward",
    new Date(refreshed.token.expired_at).getTime() >=
      new Date(authorizedBefore.token.expired_at).getTime(),
  );
  TestValidator.predicate(
    "refreshable until moved forward",
    new Date(refreshed.token.refreshable_until).getTime() >=
      new Date(authorizedBefore.token.refreshable_until).getTime(),
  );
  TestValidator.predicate(
    "created at preserved",
    refreshed.created_at === authorizedBefore.created_at,
  );
  TestValidator.predicate(
    "deleted at preserved",
    refreshed.deleted_at === authorizedBefore.deleted_at,
  );
  const secondRefreshConnection: api.IConnection = { host: connection.host };
  const secondRefreshed = await authorize_admin_refresh(
    secondRefreshConnection,
    {
      body: {
        refreshToken: refreshed.token.refresh,
      } satisfies ICommunityPlatformAdmin.IRefresh,
    },
  );
  typia.assert(secondRefreshed);
  TestValidator.equals(
    "second refresh preserves admin id",
    secondRefreshed.id,
    refreshed.id,
  );
  TestValidator.equals(
    "second refresh preserves admin email",
    secondRefreshed.email,
    refreshed.email,
  );
  TestValidator.predicate(
    "second refresh issues a new access token",
    secondRefreshed.token.access !== refreshed.token.access,
  );
  TestValidator.predicate(
    "second refresh issues a new refresh token",
    secondRefreshed.token.refresh !== refreshed.token.refresh,
  );
}
