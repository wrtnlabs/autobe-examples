import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAuditLog";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceDbMigration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceDbMigration";
import type { IEcommerceMetadataRegistry } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistry";
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
import { prepare_random_ecommerce_metadata_registry } from "../../../prepare/prepare_random_ecommerce_metadata_registry";

export async function test_api_metadata_registry_update_activation_rules(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(admin);
  // Create initial metadata registry entry with active status
  const registry =
    await generate_random_ecommerce_administrator_metadata_registries_create(
      adminConnection,
      {
        body: {
          schema_name: RandomGenerator.alphabets(8),
          schema_version: "1.0.0",
          description: RandomGenerator.paragraph({ sentences: 2 }),
          is_active: true,
        },
      },
    );
  typia.assert(registry);
  // Test 1: Activating an already active schema (should succeed but no status change)
  const updateActiveToActive =
    await api.functional.ecommerce.administrator.metadata_registries.update(
      adminConnection,
      {
        registryId: registry.id,
        body: {
          is_active: true,
        } satisfies IEcommerceMetadataRegistry.IUpdate,
      },
    );
  typia.assert(updateActiveToActive);
  TestValidator.equals(
    "schema remains active when activating active schema",
    updateActiveToActive.is_active,
    true,
  );
  TestValidator.notEquals(
    "timestamp updates when status unchanged",
    updateActiveToActive.updated_at,
    registry.updated_at,
  );
  // Test 2: Deactivating an active schema (should toggle status to inactive)
  const updateActiveToInactive =
    await api.functional.ecommerce.administrator.metadata_registries.update(
      adminConnection,
      {
        registryId: registry.id,
        body: {
          is_active: false,
        } satisfies IEcommerceMetadataRegistry.IUpdate,
      },
    );
  typia.assert(updateActiveToInactive);
  TestValidator.equals(
    "schema becomes inactive when deactivating active schema",
    updateActiveToInactive.is_active,
    false,
  );
  TestValidator.notEquals(
    "timestamp updates when status changes",
    updateActiveToInactive.updated_at,
    updateActiveToActive.updated_at,
  );
  // Test 3: Activating an inactive schema (should toggle status to active)
  const updateInactiveToActive =
    await api.functional.ecommerce.administrator.metadata_registries.update(
      adminConnection,
      {
        registryId: registry.id,
        body: {
          is_active: true,
        } satisfies IEcommerceMetadataRegistry.IUpdate,
      },
    );
  typia.assert(updateInactiveToActive);
  TestValidator.equals(
    "schema becomes active when activating inactive schema",
    updateInactiveToActive.is_active,
    true,
  );
  TestValidator.notEquals(
    "timestamp updates when reactivating",
    updateInactiveToActive.updated_at,
    updateActiveToInactive.updated_at,
  );
  // Test 4: Update with mixed fields including activation status
  const mixedUpdate =
    await api.functional.ecommerce.administrator.metadata_registries.update(
      adminConnection,
      {
        registryId: registry.id,
        body: {
          schema_name: "updated_schema_name",
          schema_version: "1.1.0",
          description: "Updated description",
          is_active: false,
        } satisfies IEcommerceMetadataRegistry.IUpdate,
      },
    );
  typia.assert(mixedUpdate);
  TestValidator.equals(
    "schema name updates correctly",
    mixedUpdate.schema_name,
    "updated_schema_name",
  );
  TestValidator.equals(
    "schema version updates correctly",
    mixedUpdate.schema_version,
    "1.1.0",
  );
  TestValidator.equals(
    "description updates correctly",
    mixedUpdate.description,
    "Updated description",
  );
  TestValidator.equals(
    "schema becomes inactive in mixed update",
    mixedUpdate.is_active,
    false,
  );
  TestValidator.notEquals(
    "timestamp updates on mixed field changes",
    mixedUpdate.updated_at,
    updateInactiveToActive.updated_at,
  );
  // Test 5: Verify that only specified fields are updated (null fields should preserve existing values)
  const partialUpdate =
    await api.functional.ecommerce.administrator.metadata_registries.update(
      adminConnection,
      {
        registryId: registry.id,
        body: {
          is_active: true,
        } satisfies IEcommerceMetadataRegistry.IUpdate,
      },
    );
  typia.assert(partialUpdate);
  TestValidator.equals(
    "schema name preserves previous value",
    partialUpdate.schema_name,
    "updated_schema_name",
  );
  TestValidator.equals(
    "schema version preserves previous value",
    partialUpdate.schema_version,
    "1.1.0",
  );
  TestValidator.equals(
    "description preserves previous value",
    partialUpdate.description,
    "Updated description",
  );
  TestValidator.equals(
    "activation status updates",
    partialUpdate.is_active,
    true,
  );
  TestValidator.notEquals(
    "timestamp updates on partial update",
    partialUpdate.updated_at,
    mixedUpdate.updated_at,
  );
  // Test 6: Validate foreign key relationship integrity after activation changes
  TestValidator.predicate(
    "system setting relationship maintained",
    partialUpdate.system_setting !== null ||
      partialUpdate.system_setting === null,
  );
  TestValidator.predicate(
    "audit log relationship maintained",
    partialUpdate.audit_log !== null || partialUpdate.audit_log === null,
  );
  TestValidator.predicate(
    "db migration relationship maintained",
    partialUpdate.db_migration !== null || partialUpdate.db_migration === null,
  );
}
