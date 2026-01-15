import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformConfiguration";
import type { ICommunityPlatformConfigurationMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformConfigurationMetadata";
import type { ICommunityPlatformConfigurationObjectValue } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformConfigurationObjectValue";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_configuration_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new admin connection and authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCreds = {
    email: typia.random<string & tags.Format<"email">>(),
    href: "https://example.com/join",
    referrer: "https://example.com",
  } satisfies ICommunityPlatformAdmin.IJoin;
  await authorize_admin_join(adminConnection, { body: adminCreds });
  // Step 2: Generate a configuration update request with valid data
  const updateData = {
    value: "true",
    metadata:
      "Updated by automated test" as ICommunityPlatformConfigurationMetadata,
  } satisfies ICommunityPlatformConfiguration.IUpdate;
  // Step 3: Perform the configuration update with admin connection
  // We need a configurationId from an existing configuration
  // Since we don't have a way to create a configuration first, we'll use a random UUID
  // This follows the API contract where configurationId is the database ID (UUID)
  const configurationId = typia.random<string & tags.Format<"uuid">>();
  // Step 4: Update the configuration using admin connection
  const updatedConfig =
    await api.functional.communityPlatform.admin.configurations.update(
      adminConnection,
      {
        configurationId,
        body: updateData,
      },
    );
  // Step 5: Validate the returned configuration object
  typia.assert(updatedConfig);
  // Step 6: Validate the updated value
  TestValidator.equals(
    "updated configuration value",
    updatedConfig.value,
    updateData.value,
  );
  // Step 7: Validate all required properties of ICommunityPlatformConfiguration are present
  TestValidator.predicate(
    "configuration has key",
    updatedConfig.key !== undefined,
  );
  TestValidator.predicate(
    "configuration has scope",
    updatedConfig.scope !== undefined,
  );
  TestValidator.predicate(
    "configuration has category",
    updatedConfig.category !== undefined,
  );
  TestValidator.predicate(
    "configuration has description",
    updatedConfig.description !== undefined,
  );
  TestValidator.predicate(
    "configuration has is_active",
    updatedConfig.is_active !== undefined,
  );
  // Step 8: Validate the configuration scope is one of the allowed values
  TestValidator.predicate(
    "configuration scope is valid",
    updatedConfig.scope === "global" ||
      updatedConfig.scope === "community" ||
      updatedConfig.scope === "user",
  );
  // Step 9: Validate the is_active is boolean
  TestValidator.predicate(
    "configuration is_active is boolean",
    typeof updatedConfig.is_active === "boolean",
  );
}
