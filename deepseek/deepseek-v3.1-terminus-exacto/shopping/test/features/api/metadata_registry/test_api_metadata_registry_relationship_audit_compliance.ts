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

export async function test_api_metadata_registry_relationship_audit_compliance(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSuperAdministrator.IJoin,
  });
  // Create initial metadata registry
  const registry =
    await generate_random_ecommerce_super_administrator_metadata_registries_create(
      superAdminConnection,
      {
        body: {
          schema_name: "test_schema",
          schema_version: "1.0.0",
          description: "Test schema registry for relationship audit testing",
          is_active: true,
        } satisfies IEcommerceMetadataRegistry.ICreate,
      },
    );
  typia.assert(registry);
  // Create timestamp reference
  const startTime = new Date().getTime();
  // Create multiple relationships with different action types over time
  const relationships: IEcommerceMetadataRegistryRelationship[] = [];
  const actionTypes = ["parent_child", "dependency", "reference", "mapping"];
  for (const actionType of actionTypes) {
    // Wait a small amount to ensure different timestamps
    await new Promise((resolve) => setTimeout(resolve, 10));
    const relationship =
      await generate_random_ecommerce_super_administrator_metadata_registries_relationships_create(
        superAdminConnection,
        {
          params: { registryId: registry.id },
          body: {
            action_type: actionType,
            general_description: `Test ${actionType} relationship with audit verification`,
            super_administrator_id: null,
          } satisfies IEcommerceMetadataRegistryRelationship.ICreate,
        },
      );
    typia.assert(relationship);
    relationships.push(relationship);
    // Validate relationship properties
    TestValidator.equals(
      "action type matches",
      relationship.action_type,
      actionType,
    );
    TestValidator.predicate(
      "has created_at timestamp",
      relationship.created_at !== null,
    );
    TestValidator.predicate(
      "has updated_at timestamp",
      relationship.updated_at !== null,
    );
    TestValidator.predicate(
      "created_at is valid date",
      !isNaN(new Date(relationship.created_at).getTime()),
    );
    TestValidator.predicate(
      "updated_at is valid date",
      !isNaN(new Date(relationship.updated_at).getTime()),
    );
    // Verify timestamps are after test start
    const relationshipTime = new Date(relationship.created_at).getTime();
    TestValidator.predicate(
      "relationship created after test start",
      relationshipTime >= startTime,
    );
  }
  // Validate timestamp ordering (each subsequent relationship should have later timestamp)
  for (let i = 1; i < relationships.length; i++) {
    const prevCreatedAt = new Date(relationships[i - 1].created_at).getTime();
    const currCreatedAt = new Date(relationships[i].created_at).getTime();
    TestValidator.predicate(
      `timestamp ${i} should be greater than ${i - 1}`,
      currCreatedAt >= prevCreatedAt,
    );
  }
  // Validate immutable relationship definitions
  TestValidator.equals(
    "all relationships have unique IDs",
    new Set(relationships.map((r) => r.id)).size,
    relationships.length,
  );
  // Validate data integrity by checking that registry metadata remains unchanged
  TestValidator.equals(
    "registry schema name intact",
    registry.schema_name,
    "test_schema",
  );
  TestValidator.equals(
    "registry schema version intact",
    registry.schema_version,
    "1.0.0",
  );
  TestValidator.equals(
    "registry description intact",
    registry.description,
    "Test schema registry for relationship audit testing",
  );
  TestValidator.equals(
    "registry active status intact",
    registry.is_active,
    true,
  );
}
