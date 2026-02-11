import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_refresh(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account
  const joinConnection: api.IConnection = { host: connection.host };
  const createAdmin = await authorize_admin_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
      username: RandomGenerator.name(),
    } satisfies ICommunityAdmin.IJoin,
  });
  typia.assert(createAdmin);
  // 2. Test token refresh
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedAdmin = await authorize_admin_refresh(refreshConnection, {
    body: {
      token: createAdmin.token.refresh,
    } satisfies ICommunityAdmin.IRefresh,
  });
  typia.assert(refreshedAdmin);
}
