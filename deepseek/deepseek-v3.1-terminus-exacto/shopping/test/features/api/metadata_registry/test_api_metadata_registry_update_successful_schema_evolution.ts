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

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_metadata_registry_update_successful_schema_evolution(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator account
  const superAdminConnection: api.IConnection = { host: connection.host };
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
  // 2. Update an existing metadata registry (assumes registry exists in test environment)
  // Using a realistic schema evolution update scenario
  const updateBody = {
    registryId: typia.random<string & tags.Format<"uuid">>(), // Real ID would come from existing registry
    body: {
      schema_version: "1.1.0",
      description:
        "Updated description with schema evolution for enhanced functionality",
      is_active: true,
    } satisfies IEcommerceMetadataRegistry.IUpdate,
  };
  const updatedRegistry =
    await api.functional.ecommerce.superAdministrator.metadata_registries.update(
      superAdminConnection,
      updateBody,
    );
  typia.assert(updatedRegistry);
  // 3. Validate the registry update response structure
  TestValidator.equals(
    "schema version updated correctly",
    updatedRegistry.schema_version,
    "1.1.0",
  );
  TestValidator.equals(
    "description updated correctly",
    updatedRegistry.description,
    "Updated description with schema evolution for enhanced functionality",
  );
  TestValidator.equals("is_active maintained", updatedRegistry.is_active, true);
  TestValidator.predicate(
    "registry ID is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      updatedRegistry.id,
    ),
  );
  TestValidator.predicate(
    "schema name is present",
    updatedRegistry.schema_name.length > 0,
  );
  TestValidator.predicate(
    "created_at timestamp is valid",
    new Date(updatedRegistry.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "updated_at timestamp is valid",
    new Date(updatedRegistry.updated_at).getTime() > 0,
  );
  // 4. Validate foreign key relationships structure
  TestValidator.predicate(
    "system_setting relationship exists",
    updatedRegistry.system_setting === null ||
      typeof updatedRegistry.system_setting === "object",
  );
  TestValidator.predicate(
    "audit_log relationship exists",
    updatedRegistry.audit_log === null ||
      typeof updatedRegistry.audit_log === "object",
  );
  TestValidator.predicate(
    "db_migration relationship exists",
    updatedRegistry.db_migration === null ||
      typeof updatedRegistry.db_migration === "object",
  );
}
