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
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_configuration_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: ICommunityBbsAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<
          string & tags.MinLength<8> & tags.MaxLength<128>
        >(),
      } satisfies ICommunityBbsAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Get an existing configuration to update
  // Create a new configuration with a unique key for this test
  const uniqueKey = `test_config_${RandomGenerator.alphaNumeric(8)}`;
  const initialValue = { enabled: false, message: "initial" };
  const initialValueString = JSON.stringify(initialValue);
  // Step 3: Create the configuration first through the API with admin connection
  // We must create a configuration entry before we can update it
  await api.functional.communityBbs.admin.configurations.update(
    adminConnection,
    {
      configurationKey: uniqueKey,
      body: {
        value: initialValueString,
      } satisfies ICommunityBbsConfiguration.IUpdate,
    },
  );
  // Step 4: Update the configuration value
  const newValue = { enabled: true, message: RandomGenerator.paragraph() };
  const newValueString = JSON.stringify(newValue);
  const updatedConfig: ICommunityBbsConfiguration =
    await api.functional.communityBbs.admin.configurations.update(
      adminConnection,
      {
        configurationKey: uniqueKey,
        body: {
          value: newValueString,
        } satisfies ICommunityBbsConfiguration.IUpdate,
      },
    );
  typia.assert(updatedConfig);
  // Step 5: Validate that the configuration was updated
  TestValidator.equals(
    "configuration key matches",
    updatedConfig.key,
    uniqueKey,
  );
  TestValidator.predicate(
    "updated_at is not null",
    updatedConfig.updatedAt !== null,
  );
  TestValidator.predicate(
    "updated_at is after created_at",
    new Date(updatedConfig.updatedAt) > new Date(updatedConfig.createdAt),
  );
  // Step 6: Verify the value was properly stored and parsed
  const configValue = JSON.parse(typia.assert<string>(updatedConfig.value));
  TestValidator.equals(
    "configuration value has enabled property",
    configValue.enabled,
    true,
  );
  TestValidator.equals(
    "configuration value has message property",
    configValue.message,
    newValue.message,
  );
  TestValidator.predicate(
    "message is a string",
    typeof configValue.message === "string" && configValue.message.length > 0,
  );
  // Step 7: Validate the configuration structure using typia types
  typia.assert(updatedConfig);
}