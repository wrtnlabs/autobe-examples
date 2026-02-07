import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
import type { ICommunitySystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySystemConfig";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_system_config_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin registration
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<ICommunityAdmin.IJoin>(),
  });
  // 2. Generate a valid UUID for the configId (required by endpoint)
  const configId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve the system configuration by ID
  const retrievedConfig =
    await api.functional.community.admin.system_configs.at(adminConnection, {
      configId,
    });
  typia.assert(retrievedConfig);
  // 4. Validate the response conforms to the schema (empty object)
  TestValidator.predicate(
    "config is defined",
    retrievedConfig !== null && retrievedConfig !== undefined,
  );
  TestValidator.predicate(
    "config is object",
    typeof retrievedConfig === "object",
  );
}
