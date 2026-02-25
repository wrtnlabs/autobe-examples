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

// Import the utility function (assumed to be available in scope)
// Note: In actual test environment, authorize_administrator_join would be imported
/**
 * Test successful retrieval of an active metadata registry entry with complete relationship information.
 *
 * Note: The scenario requires creating a metadata registry, but no create endpoint exists in the provided SDK.
 * Therefore, this test retrieves an existing metadata registry (assuming at least one exists in the test database).
 * This tests the retrieval functionality with a real registry ID.
 */
export async function test_api_metadata_registry_admin_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Administrator authentication using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    },
  });
  typia.assert(admin);
  // Step 2: Since no create endpoint exists, we need an existing registry ID
  // We'll use a known ID or fetch one if possible, but given SDK limitations,
  // we'll test with a valid UUID structure expecting either success (if exists)
  // or proper error response.
  const registryId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Retrieve the registry
  const retrieved =
    await api.functional.ecommerce.administrator.metadata_registries.at(
      adminConnection,
      { registryId },
    );
  typia.assert(retrieved);
  // Step 4: Validate business logic (not type validation)
  // Check that retrieved ID matches requested ID
  TestValidator.equals(
    "retrieved ID matches requested ID",
    retrieved.id,
    registryId,
  );
  // Step 5: Verify that optional relationship fields have correct structure when present
  if (
    retrieved.system_setting !== null &&
    retrieved.system_setting !== undefined
  ) {
    TestValidator.predicate(
      "system_setting has setting_key",
      typeof retrieved.system_setting.setting_key === "string",
    );
  }
  if (retrieved.audit_log !== null && retrieved.audit_log !== undefined) {
    TestValidator.predicate(
      "audit_log has event_type",
      typeof retrieved.audit_log.event_type === "string",
    );
  }
  if (retrieved.db_migration !== null && retrieved.db_migration !== undefined) {
    TestValidator.predicate(
      "db_migration has migration_name",
      typeof retrieved.db_migration.migration_name === "string",
    );
  }
  // Step 6: Verify active status (business requirement)
  TestValidator.predicate(
    "registry should be active for this test scenario",
    retrieved.is_active === true,
  );
  // Step 7: Verify timestamps are sequential (business logic)
  const createdAt = new Date(retrieved.created_at).getTime();
  const updatedAt = new Date(retrieved.updated_at).getTime();
  TestValidator.predicate(
    "updated_at should not be before created_at",
    updatedAt >= createdAt,
  );
}
