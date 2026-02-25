import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAuditLog";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceDbMigration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceDbMigration";
import type { IEcommerceMetadataRegistry } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistry";
import type { IEcommerceMetadataRegistryRelationship } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistryRelationship";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import type { IEcommerceSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSystemSetting";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_ecommerce_administrator_metadata_registries_create } from "../../../generate/generate_random_ecommerce_administrator_metadata_registries_create";
import { generate_random_ecommerce_administrator_metadata_registries_relationships_create } from "../../../generate/generate_random_ecommerce_administrator_metadata_registries_relationships_create";
import { prepare_random_ecommerce_metadata_registry } from "../../../prepare/prepare_random_ecommerce_metadata_registry";
import { prepare_random_ecommerce_metadata_registry_relationship } from "../../../prepare/prepare_random_ecommerce_metadata_registry_relationship";

export async function test_api_metadata_registry_relationship_full_update(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test1234",
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // Create metadata registry
  const registry =
    await api.functional.ecommerce.administrator.metadata_registries.create(
      adminConnection,
      {
        body: {
          schema_name: RandomGenerator.alphabets(10),
          schema_version: "1.0.0",
          description: RandomGenerator.paragraph({ sentences: 2 }),
          is_active: true,
        } satisfies IEcommerceMetadataRegistry.ICreate,
      },
    );
  typia.assert(registry);
  // Create initial relationship
  const initialRelationship =
    await api.functional.ecommerce.administrator.metadata_registries.relationships.create(
      adminConnection,
      {
        registryId: registry.id,
        body: {
          action_type: "dependency",
          general_description: "Initial relationship description",
          super_administrator_id: null,
        } satisfies IEcommerceMetadataRegistryRelationship.ICreate,
      },
    );
  typia.assert(initialRelationship);
  // Store timestamps for comparison
  const originalCreatedAt = initialRelationship.created_at;
  const originalUpdatedAt = initialRelationship.updated_at;
  // Create update data with correct field names
  const updateData = {
    relationship_type: "parent_child",
    relationship_direction: "bidirectional",
    relationship_description:
      "Updated relationship description with new values",
  } satisfies IEcommerceMetadataRegistryRelationship.IUpdate;
  // Perform full update
  const updatedRelationship =
    await api.functional.ecommerce.administrator.metadata_registries.relationships.update(
      adminConnection,
      {
        registryId: registry.id,
        relationshipId: initialRelationship.id,
        body: updateData,
      },
    );
  typia.assert(updatedRelationship);
  // Verify response contains valid data (typia.assert already validates structure)
  TestValidator.notEquals("response received", updatedRelationship, null);
  // Verify timestamps
  TestValidator.equals(
    "created_at unchanged",
    updatedRelationship.created_at,
    originalCreatedAt,
  );
  TestValidator.notEquals(
    "updated_at changed",
    updatedRelationship.updated_at,
    originalUpdatedAt,
  );
  // Verify relationship still belongs to same registry and has same ID
  TestValidator.equals(
    "relationship ID unchanged",
    updatedRelationship.id,
    initialRelationship.id,
  );
  // Verify relationship entity has required properties
  TestValidator.predicate(
    "has action_type",
    typeof updatedRelationship.action_type === "string",
  );
  TestValidator.predicate(
    "has general_description",
    typeof updatedRelationship.general_description === "string",
  );
  TestValidator.predicate(
    "has created_at",
    typeof updatedRelationship.created_at === "string",
  );
  TestValidator.predicate(
    "has updated_at",
    typeof updatedRelationship.updated_at === "string",
  );
}
