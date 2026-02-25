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

export async function test_api_metadata_registry_update_successful(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const administrator = await authorize_administrator_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>() || "Admin123!",
    } satisfies IEcommerceAdministrator.ILogin,
  });
  typia.assert(administrator);
  // Create initial metadata registry entry with proper semantic versioning
  const initialRegistry =
    await generate_random_ecommerce_administrator_metadata_registries_create(
      adminConnection,
      {
        body: {
          schema_name: "user_profile_schema",
          schema_version: "1.0.0",
          description: RandomGenerator.paragraph({ sentences: 2 }),
          is_active: true,
        } satisfies IEcommerceMetadataRegistry.ICreate,
      },
    );
  typia.assert(initialRegistry);
  // Store original timestamps for comparison
  const originalCreatedAt = initialRegistry.created_at;
  const originalUpdatedAt = initialRegistry.updated_at;
  // Update the metadata registry entry
  const updateData: IEcommerceMetadataRegistry.IUpdate = {
    schema_version: "2.0.0",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    is_active: false,
  };
  const updatedRegistry =
    await api.functional.ecommerce.administrator.metadata_registries.update(
      adminConnection,
      {
        registryId: initialRegistry.id,
        body: updateData,
      },
    );
  typia.assert(updatedRegistry);
  // Validate update results
  TestValidator.equals("ID unchanged", updatedRegistry.id, initialRegistry.id);
  TestValidator.equals(
    "schema_name unchanged",
    updatedRegistry.schema_name,
    initialRegistry.schema_name,
  );
  TestValidator.equals(
    "schema_version updated",
    updatedRegistry.schema_version,
    "2.0.0",
  );
  TestValidator.equals(
    "description updated",
    updatedRegistry.description,
    updateData.description,
  );
  TestValidator.equals("is_active updated", updatedRegistry.is_active, false);
  TestValidator.equals(
    "created_at unchanged",
    updatedRegistry.created_at,
    originalCreatedAt,
  );
  TestValidator.notEquals(
    "updated_at changed",
    updatedRegistry.updated_at,
    originalUpdatedAt,
  );
  // Validate semantic versioning format for new version
  TestValidator.predicate(
    "semantic versioning format",
    /^\d+\.\d+\.\d+$/.test(updatedRegistry.schema_version),
  );
  // Validate relationships are properly handled (should remain null as per foreign key constraints)
  TestValidator.equals(
    "system_setting remains null",
    updatedRegistry.system_setting,
    null,
  );
  TestValidator.equals(
    "audit_log remains null",
    updatedRegistry.audit_log,
    null,
  );
  TestValidator.equals(
    "db_migration remains null",
    updatedRegistry.db_migration,
    null,
  );
}
