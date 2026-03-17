import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallPlatformConfiguration";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_platform_configuration_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register superAdmin account
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_super_admin_join(joinConnection, {
    body: typia.random<IEcommerceMallSuperAdmin.IJoin>(),
  });
  typia.assert(joinResult);
  // 2. Use the authenticated connection (headers updated by authorize_super_admin_join)
  const adminConnection: api.IConnection = { host: connection.host };
  adminConnection.headers = joinConnection.headers;
  // 3. Generate non-existent UUID
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  // 4. Attempt to retrieve non-existent configuration
  await TestValidator.httpError(
    "should return 404 for non-existent configuration",
    404,
    async () => {
      await api.functional.ecommerceMall.superAdmin.platform_configurations.at(
        adminConnection,
        {
          configId: nonExistentId,
        },
      );
    },
  );
}
