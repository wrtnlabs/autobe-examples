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

export async function test_api_metadata_registry_relationship_complex_types(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super administrator
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
  // Create a metadata registry
  const registry =
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
  typia.assert(registry);
  // Create complex relationship with detailed description
  const relationship1 =
    await generate_random_ecommerce_super_administrator_metadata_registries_relationships_create(
      superAdminConnection,
      {
        params: { registryId: registry.id },
        body: {
          action_type: "dependency_mapping",
          general_description:
            "Defines dependency relationship establishing schema prerequisites and requirements",
          super_administrator_id: superAdmin.id,
        } satisfies IEcommerceMetadataRegistryRelationship.ICreate,
      },
    );
  typia.assert(relationship1);
  TestValidator.predicate(
    "relationship has action type",
    relationship1.action_type.length > 0,
  );
  TestValidator.predicate(
    "relationship has detailed description",
    relationship1.general_description.length > 10,
  );
  // Create reference relationship with business context
  const relationship2 =
    await generate_random_ecommerce_super_administrator_metadata_registries_relationships_create(
      superAdminConnection,
      {
        params: { registryId: registry.id },
        body: {
          action_type: "reference_link",
          general_description:
            "Establishes cross-reference mapping between metadata registries for data governance",
          super_administrator_id: superAdmin.id,
        } satisfies IEcommerceMetadataRegistryRelationship.ICreate,
      },
    );
  typia.assert(relationship2);
  TestValidator.equals(
    "relationship type differs",
    relationship1.action_type !== relationship2.action_type,
    true
  );
  TestValidator.predicate(
    "second relationship has business context",
    relationship2.general_description.includes("data governance"),
  );
  // Create administrative relationship with complex configuration
  const relationship3 =
    await generate_random_ecommerce_super_administrator_metadata_registries_relationships_create(
      superAdminConnection,
      {
        params: { registryId: registry.id },
        body: {
          action_type: "administrative_link",
          general_description:
            "Administrative linkage supporting variant configurations and semantic relationships",
          super_administrator_id: superAdmin.id,
        } satisfies IEcommerceMetadataRegistryRelationship.ICreate,
      },
    );
  typia.assert(relationship3);
  TestValidator.predicate(
    "third relationship supports complex configurations",
    relationship3.general_description.includes("variant configurations"),
  );
  // Validate semantic integrity across relationships
  TestValidator.notEquals(
    "different relationship IDs",
    relationship1.id,
    relationship2.id,
  );
  TestValidator.notEquals(
    "different relationship IDs",
    relationship2.id,
    relationship3.id,
  );
  // Test relationship creation sequence and timestamps
  TestValidator.predicate(
    "relationships created in sequence",
    new Date(relationship1.created_at) <= new Date(relationship2.created_at) &&
      new Date(relationship2.created_at) <= new Date(relationship3.created_at),
  );
  // Validate administrator attribution consistency
  TestValidator.equals(
    "consistent administrator attribution",
    relationship1.administrator?.id,
    relationship2.administrator?.id,
  );
}