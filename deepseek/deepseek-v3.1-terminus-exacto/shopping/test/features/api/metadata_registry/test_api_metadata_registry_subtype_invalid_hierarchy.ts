import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceMetadataRegistryRelationship } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistryRelationship";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_metadata_registry_subtype_invalid_hierarchy(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as administrator
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // Generate test IDs - all valid UUIDs but will not exist in hierarchy
  const registryId = typia.random<string & tags.Format<"uuid">>();
  const relationshipId = typia.random<string & tags.Format<"uuid">>();
  const subtypeId = typia.random<string & tags.Format<"uuid">>();
  // Test scenario 1: Valid registry ID but invalid relationship ID
  await TestValidator.httpError(
    "registry with invalid relationship should return 404",
    404,
    async () => {
      await api.functional.ecommerce.administrator.metadata_registries.relationships.subtypes.at(
        adminConnection,
        {
          registryId: registryId,
          relationshipId: typia.random<string & tags.Format<"uuid">>(), // Different relationship
          subtypeId: subtypeId,
        },
      );
    },
  );
  // Test scenario 2: Valid registry and relationship IDs but invalid subtype ID
  await TestValidator.httpError(
    "relationship with invalid subtype should return 404",
    404,
    async () => {
      await api.functional.ecommerce.administrator.metadata_registries.relationships.subtypes.at(
        adminConnection,
        {
          registryId: registryId,
          relationshipId: relationshipId,
          subtypeId: typia.random<string & tags.Format<"uuid">>(), // Different subtype
        },
      );
    },
  );
  // Test scenario 3: Mismatched hierarchy - valid IDs but wrong relationships
  await TestValidator.httpError(
    "mismatched hierarchy should return 404",
    404,
    async () => {
      await api.functional.ecommerce.administrator.metadata_registries.relationships.subtypes.at(
        adminConnection,
        {
          registryId: typia.random<string & tags.Format<"uuid">>(), // Different registry
          relationshipId: relationshipId,
          subtypeId: subtypeId,
        },
      );
    },
  );
  // Test scenario 4: All IDs are valid but none exist in database
  await TestValidator.httpError(
    "non-existent hierarchy IDs should return 404",
    404,
    async () => {
      await api.functional.ecommerce.administrator.metadata_registries.relationships.subtypes.at(
        adminConnection,
        {
          registryId: typia.random<string & tags.Format<"uuid">>(),
          relationshipId: typia.random<string & tags.Format<"uuid">>(),
          subtypeId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
