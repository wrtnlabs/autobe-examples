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

/**
 * Test basic successful creation of a metadata registry entry by an administrator.
 * 1. Create an administrator account using authorize_administrator_join utility
 * 2. Create a metadata registry entry with required fields
 * 3. Validate all response fields match IEcommerceMetadataRegistry schema
 * 4. Verify timestamps and default is_active = true
 */
export async function test_api_metadata_registry_creation_basic_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {});
  typia.assert(admin);
  // Step 2: Prepare unique metadata registry data
  const body = {
    schema_name: typia.random<string>(),
    schema_version: `1.0.${typia.random<number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<999>>()}`,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    is_active: true,
  } satisfies IEcommerceMetadataRegistry.ICreate;
  // Step 3: Create metadata registry entry
  const registry =
    await generate_random_ecommerce_administrator_metadata_registries_create(
      adminConnection,
      { body },
    );
  typia.assert(registry);
  // Step 4: Validate response matches input and business logic
  TestValidator.equals(
    "schema_name matches",
    registry.schema_name,
    body.schema_name,
  );
  TestValidator.equals(
    "schema_version matches",
    registry.schema_version,
    body.schema_version,
  );
  TestValidator.equals(
    "description matches",
    registry.description,
    body.description,
  );
  TestValidator.equals("is_active is true", registry.is_active, true);
  // Step 5: Validate related summaries are present (may be null)
  TestValidator.predicate(
    "system_setting is object or null",
    registry.system_setting === null ||
      typeof registry.system_setting === "object",
  );
  TestValidator.predicate(
    "audit_log is object or null",
    registry.audit_log === null || typeof registry.audit_log === "object",
  );
  TestValidator.predicate(
    "db_migration is object or null",
    registry.db_migration === null || typeof registry.db_migration === "object",
  );
}
