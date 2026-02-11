import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformSystematicConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformSystematicConfig";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_system_config_bulk_update_empty_array(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12341234",
      username: RandomGenerator.name(),
      display_name: null,
      bio: null,
    } satisfies IRedditPlatformAdmin.IJoin,
  });
  // Test empty configuration array
  const output =
    await api.functional.redditPlatform.admin.system_configs.bulk.updateBulk(
      adminConnection,
      {
        body: {
          value: [] satisfies IRedditPlatformSystematicConfig.IUpdate[],
        } satisfies IRedditPlatformSystematicConfig.IUpdateBulk,
      },
    );
  typia.assert(output);
  // Validate response structure for empty array case
  TestValidator.equals("configs is empty array", output.configs.length, 0);
  TestValidator.equals("successCount is zero", output.successCount, 0);
  TestValidator.equals("totalCount is zero", output.totalCount, 0);
}
