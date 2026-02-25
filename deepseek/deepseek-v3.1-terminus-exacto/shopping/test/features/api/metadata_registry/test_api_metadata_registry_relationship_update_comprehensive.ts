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

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_ecommerce_super_administrator_metadata_registries_create } from "../../../generate/generate_random_ecommerce_super_administrator_metadata_registries_create";
import { generate_random_ecommerce_super_administrator_metadata_registries_relationships_create } from "../../../generate/generate_random_ecommerce_super_administrator_metadata_registries_relationships_create";
import { prepare_random_ecommerce_metadata_registry } from "../../../prepare/prepare_random_ecommerce_metadata_registry";
import { prepare_random_ecommerce_metadata_registry_relationship } from "../../../prepare/prepare_random_ecommerce_metadata_registry_relationship";

export async function test_api_metadata_registry_relationship_update_comprehensive(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Register super administrator
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceSuperAdministrator.IJoin,
    },
  );
  typia.assert(superAdmin);
  // Create metadata registry
  const metadataRegistry =
    await generate_random_ecommerce_super_administrator_metadata_registries_create(
      superAdminConnection,
      {
        body: {
          schema_name: RandomGenerator.alphabets(10),
          schema_version: "1.0.0",
          description: RandomGenerator.paragraph({ sentences: 2 }),
          is_active: true,
        } satisfies IEcommerceMetadataRegistry.ICreate,
      },
    );
  typia.assert(metadataRegistry);
  // Create initial relationship
  const initialRelationship =
    await generate_random_ecommerce_super_administrator_metadata_registries_relationships_create(
      superAdminConnection,
      {
        params: { registryId: metadataRegistry.id },
        body: {
          action_type: "dependency",
          general_description: "Initial relationship description",
          super_administrator_id: superAdmin.id,
        } satisfies IEcommerceMetadataRegistryRelationship.ICreate,
      },
    );
  typia.assert(initialRelationship);
  // Prepare comprehensive update data
  const updateData: IEcommerceMetadataRegistryRelationship.IUpdate = {
    relationship_type: "parent_child",
    relationship_direction: "bidirectional",
    relationship_description: "Updated comprehensive relationship description",
  };
  // Perform comprehensive update
  const updatedRelationship =
    await api.functional.ecommerce.superAdministrator.metadata_registries.relationships.update(
      superAdminConnection,
      {
        registryId: metadataRegistry.id,
        relationshipId: initialRelationship.id,
        body: updateData,
      },
    );
  typia.assert(updatedRelationship);
  // Validate comprehensive updates
  TestValidator.equals(
    "relationship ID unchanged",
    updatedRelationship.id,
    initialRelationship.id,
  );
  TestValidator.equals(
    "action type updated",
    updatedRelationship.action_type,
    updateData.relationship_type,
  );
  TestValidator.equals(
    "general description updated",
    updatedRelationship.general_description,
    updateData.relationship_description,
  );
  TestValidator.notEquals(
    "updated_at timestamp refreshed",
    updatedRelationship.updated_at,
    initialRelationship.updated_at,
  );
  TestValidator.predicate(
    "created_at remains unchanged",
    () => updatedRelationship.created_at === initialRelationship.created_at,
  );
  TestValidator.predicate(
    "super administrator reference intact",
    () => updatedRelationship.super_administrator?.id === superAdmin.id,
  );
}
