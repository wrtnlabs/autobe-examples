import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsAdmin";
import type { ICommunityBbsConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsConfiguration";
import type { IJSONValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IJSONValue";
import { prepare_random_community_bbs_configuration } from "../../../prepare/prepare_random_community_bbs_configuration";
import { generate_random_community_bbs_admin_configurations_create } from "../../../generate/generate_random_community_bbs_admin_configurations_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_configuration_creation_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin-specific connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: ICommunityBbsAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityBbsAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Generate random unique configuration key and JSON-serializable value
  const configKey = RandomGenerator.alphaNumeric(20);
  const configValue: IJSONValue = typia.random<IJSONValue>();
  // Step 3: Create configuration using generation utility (priority over SDK)
  // This handles the API call and validation
  const createdConfig: ICommunityBbsConfiguration =
    await generate_random_community_bbs_admin_configurations_create(
      adminConnection,
      {
        body: {
          key: configKey,
          value: JSON.stringify(configValue),
        } satisfies ICommunityBbsConfiguration.ICreate,
      },
    );
  typia.assert(createdConfig);
  // Step 4: Validate creation success with required assertions
  // Verify key matches exactly what was sent
  TestValidator.equals(
    "configuration key matches the requested key",
    createdConfig.key,
    configKey,
  );
  // Verify ID is present and correctly typed (validation handled by typia.assert)
  TestValidator.predicate(
    "configuration id exists",
    createdConfig.id !== undefined,
  );
  // Step 5: Validate key uniqueness enforcement
  // Try to create another configuration with same key - must fail
  await TestValidator.error(
    "duplicate configuration key should fail",
    async () => {
      await generate_random_community_bbs_admin_configurations_create(
        adminConnection,
        {
          body: {
            key: configKey, // Same key as before
            value: JSON.stringify(typia.random<IJSONValue>()),
          } satisfies ICommunityBbsConfiguration.ICreate,
        },
      );
    },
  );
}
