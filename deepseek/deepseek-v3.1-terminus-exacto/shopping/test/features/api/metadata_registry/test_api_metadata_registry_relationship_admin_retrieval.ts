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

export async function test_api_metadata_registry_relationship_admin_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  adminConnection.headers = adminConnection.headers ?? {};
  adminConnection.headers.Authorization = adminAuth.token.access;
  typia.assert(adminAuth);
  // 2. Create metadata registry entry
  const registry =
    await generate_random_ecommerce_administrator_metadata_registries_create(
      adminConnection,
      {
        body: {
          schema_name: RandomGenerator.name(1),
          schema_version: "1.0.0",
          description: RandomGenerator.paragraph({ sentences: 2 }),
          is_active: true,
        },
      },
    );
  typia.assert(registry);
  // 3. Create relationship mapping
  const relationship =
    await generate_random_ecommerce_administrator_metadata_registries_relationships_create(
      adminConnection,
      {
        params: { registryId: registry.id },
        body: {
          action_type: RandomGenerator.name(1),
          general_description: RandomGenerator.paragraph({ sentences: 1 }),
        },
      },
    );
  typia.assert(relationship);
  // 4. Retrieve the created relationship
  const retrieved =
    await api.functional.ecommerce.administrator.metadata_registries.relationships.at(
      adminConnection,
      {
        registryId: registry.id,
        relationshipId: relationship.id,
      },
    );
  typia.assert(retrieved);
  // Validate all fields match
  TestValidator.equals(
    "relationship ID matches",
    relationship.id,
    retrieved.id,
  );
  TestValidator.equals(
    "action type matches",
    relationship.action_type,
    retrieved.action_type,
  );
  TestValidator.equals(
    "description matches",
    relationship.general_description,
    retrieved.general_description,
  );
  TestValidator.equals(
    "created at matches",
    relationship.created_at,
    retrieved.created_at,
  );
  TestValidator.equals(
    "updated at matches",
    relationship.updated_at,
    retrieved.updated_at,
  );
  // Note: administrator/super_administrator fields may be null; check if they match
  if (relationship.administrator) {
    TestValidator.equals(
      "administrator matches",
      relationship.administrator,
      retrieved.administrator,
    );
  } else {
    TestValidator.equals("administrator null", retrieved.administrator, null);
  }
  if (relationship.super_administrator) {
    TestValidator.equals(
      "super administrator matches",
      relationship.super_administrator,
      retrieved.super_administrator,
    );
  } else {
    TestValidator.equals(
      "super administrator null",
      retrieved.super_administrator,
      null,
    );
  }
}
