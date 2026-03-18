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

export async function test_api_admin_refresh_ineligible_session_rejected(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(joined);
  const before: ICommunityPlatformAdmin.IAuthorized = joined;
  const invalidRefreshConnection: api.IConnection = { host: connection.host };
  invalidRefreshConnection.headers = {
    Authorization: joined.token.access,
  };
  await TestValidator.httpError(
    "admin refresh should reject an ineligible session token",
    [400, 401, 403],
    async () => {
      await authorize_admin_refresh(invalidRefreshConnection, {
        body: {
          refreshToken: typia.random<string & tags.Format<"password">>(),
        } satisfies ICommunityPlatformAdmin.IRefresh,
      });
    },
  );
  TestValidator.equals(
    "original authorization payload should remain unchanged",
    before,
    joined,
  );
}
