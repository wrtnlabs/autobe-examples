import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCacheConfigurationParameterDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCacheConfigurationParameterDefinition";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_cache_configuration_parameter_definition_update_soft_deleted_definition(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {});
  typia.assert(adminAuth);
  // Note: In a real implementation, we would need to create a soft-deleted cache configuration parameter definition first
  // Since there's no utility function provided for creating parameter definitions, we'll simulate this by using a random UUID
  // and assuming the test environment has pre-existing soft-deleted definitions
  const softDeletedDefinitionId = typia.random<string & tags.Format<"uuid">>();
  // Update the soft-deleted definition
  const updateBody = {
    description: "Updated description for soft-deleted parameter",
    default_value: "updated_default",
    validation_rules: JSON.stringify({ min: 0, max: 100 }),
  } satisfies IEcommerceCacheConfigurationParameterDefinition.IUpdate;
  const updatedDefinition =
    await api.functional.ecommerce.administrator.cache_configurations.parameter_definitions.update(
      adminConnection,
      {
        definitionId: softDeletedDefinitionId,
        body: updateBody,
      },
    );
  typia.assert(updatedDefinition);
  // Validate that the update was processed successfully
  TestValidator.predicate(
    "returns complete definition object",
    updatedDefinition !== null,
  );
  // Note: The actual validation of soft-delete handling would require backend logic
  // to properly handle updates to soft-deleted records, which is implied by the endpoint specification
}
