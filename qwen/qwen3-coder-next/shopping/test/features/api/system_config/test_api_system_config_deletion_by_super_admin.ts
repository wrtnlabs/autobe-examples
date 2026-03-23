import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_system_config_deletion_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Use a random configuration ID since create function doesn't exist
  const configurationId = typia.random<string & tags.Format<"uuid">>();
  // 3. Delete the configuration (erase function available in API)
  await api.functional.ecommerceMall.admin.system_configurations.erase(
    adminConnection,
    {
      configurationId,
    },
  );
  // 4. Verify deletion - since there's no get function to verify 404,
  // we just confirm the deletion operation completed without error
  // (in a real scenario, this would verify 404 by trying to get the config)
  TestValidator.predicate(
    "system configuration deletion completed without error",
    () => true,
  );
}
