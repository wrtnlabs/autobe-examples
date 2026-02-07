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
import { generate_random_community_admin_system_configs_create } from "../../../generate/generate_random_community_admin_system_configs_create";
import { prepare_random_community_system_config } from "../../../prepare/prepare_random_community_system_config";

export async function test_api_system_config_max_image_size_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authorize join
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<ICommunityAdmin.IJoin>(),
  });
  // 2. Create system configuration with max_image_size using utility function (mandatory priority over SDK)
  const config = await generate_random_community_admin_system_configs_create(
    adminConnection,
    {
      body: {
        name: "max_image_size",
        type: "number",
        value: 5242880,
      },
    },
  );
  // 3. Validate configuration creation using typia.assert to extract the actual structure
  // Since ICommunitySystemConfig is an empty interface ({}), we cannot validate any properties
  // The only valid validation is ensuring the response is of type ICommunitySystemConfig
  typia.assert<ICommunitySystemConfig>(config);
}
