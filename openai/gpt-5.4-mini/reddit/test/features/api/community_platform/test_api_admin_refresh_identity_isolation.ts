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

export async function test_api_admin_refresh_identity_isolation(
  connection: api.IConnection,
): Promise<void> {
  const firstAdminConnection: api.IConnection = { host: connection.host };
  const secondAdminConnection: api.IConnection = { host: connection.host };
  const firstAdmin = await authorize_admin_join(firstAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(12),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(firstAdmin);
  const secondAdmin = await authorize_admin_join(secondAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(12),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(secondAdmin);
  const crossRefreshed = await authorize_admin_refresh(firstAdminConnection, {
    body: {
      refreshToken: secondAdmin.token.refresh,
    } satisfies ICommunityPlatformAdmin.IRefresh,
  });
  typia.assert(crossRefreshed);
  TestValidator.notEquals(
    "cross-admin refresh must not return the first admin identity",
    crossRefreshed.id,
    firstAdmin.id,
  );
  TestValidator.equals(
    "cross-admin refresh should preserve the supplied token identity",
    crossRefreshed.id,
    secondAdmin.id,
  );
  TestValidator.equals(
    "cross-admin refresh should preserve the supplied token email",
    crossRefreshed.email,
    secondAdmin.email,
  );
  const refreshedFirstAdmin = await authorize_admin_refresh(
    firstAdminConnection,
    {
      body: {
        refreshToken: firstAdmin.token.refresh,
      } satisfies ICommunityPlatformAdmin.IRefresh,
    },
  );
  typia.assert(refreshedFirstAdmin);
  TestValidator.equals(
    "legitimate refresh should return the first admin identity",
    refreshedFirstAdmin.id,
    firstAdmin.id,
  );
  TestValidator.equals(
    "legitimate refresh should return the first admin email",
    refreshedFirstAdmin.email,
    firstAdmin.email,
  );
}
