import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAdmin";
import type { IMultiUserTodoSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoSystemConfiguration";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_system_configuration_retrieve_active(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IMultiUserTodoAdmin.IJoin,
  });
  // Since there's no create endpoint, we need to use a configuration ID that exists
  // We'll generate a random UUID that should correspond to an existing active configuration
  const configurationId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve the configuration using the system_configurations.at endpoint
  const retrievedConfig =
    await api.functional.multiUserTodo.admin.system_configurations.at(
      adminConnection,
      {
        configurationId,
      },
    );
  // Validate the response structure
  typia.assert(retrievedConfig);
  // Verify the configuration is active
  TestValidator.equals(
    "configuration ID should match",
    retrievedConfig.id,
    configurationId,
  );
  TestValidator.predicate(
    "config_key should be non-empty string",
    retrievedConfig.config_key.length > 0,
  );
  TestValidator.predicate(
    "config_value should be non-empty string",
    retrievedConfig.config_value.length > 0,
  );
  TestValidator.predicate(
    "data_type should be valid",
    ["string", "number", "boolean", "json"].includes(retrievedConfig.data_type),
  );
  TestValidator.predicate(
    "scope should be valid",
    ["global", "component", "environment"].includes(retrievedConfig.scope),
  );
  TestValidator.predicate(
    "description should be string",
    typeof retrievedConfig.description === "string",
  );
  TestValidator.equals(
    "is_active should be true",
    retrievedConfig.is_active,
    true,
  );
  TestValidator.predicate(
    "version should be positive integer",
    retrievedConfig.version > 0,
  );
  // Verify timestamps are properly set
  TestValidator.predicate(
    "created_at should be valid date",
    () => !isNaN(new Date(retrievedConfig.created_at).getTime()),
  );
  TestValidator.predicate(
    "updated_at should be valid date",
    () => !isNaN(new Date(retrievedConfig.updated_at).getTime()),
  );
  // Verify deleted_at is null for active configuration
  TestValidator.equals(
    "deleted_at should be null for active config",
    retrievedConfig.deleted_at,
    null,
  );
}
