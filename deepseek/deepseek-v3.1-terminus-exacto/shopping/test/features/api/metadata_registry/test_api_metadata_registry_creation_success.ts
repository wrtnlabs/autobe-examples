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
import { generate_random_ecommerce_super_administrator_metadata_registries_create } from "../../../generate/generate_random_ecommerce_super_administrator_metadata_registries_create";
import { prepare_random_ecommerce_metadata_registry } from "../../../prepare/prepare_random_ecommerce_metadata_registry";

export async function test_api_metadata_registry_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Create super admin account using SDK function (utility not available)
  const joinBody = {
    email: typia.random<string & typia.tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & typia.tags.Format<"uri">>(),
    referrer: typia.random<string & typia.tags.Format<"uri">>(),
    ip: typia.random<string & typia.tags.Format<"ipv4">>(),
  } satisfies IEcommerceSuperAdministrator.IJoin;
  const authorized =
    await api.functional.ecommerce.auth.superAdministrator.join(
      superAdminConnection,
      { body: joinBody },
    );
  typia.assert(authorized);
  // Set authorization header manually (utility function would have done this)
  superAdminConnection.headers = {
    ...superAdminConnection.headers,
    Authorization: authorized.token.access,
  };
  // 2. Prepare metadata registry creation data
  const schemaName = RandomGenerator.alphabets(10);
  const schemaVersion = "1.0.0";
  const description = RandomGenerator.paragraph({
    sentences: 2,
  }) satisfies string as string;
  // 3. Create metadata registry using SDK function (generation utility not available)
  const createBody = {
    schema_name: schemaName,
    schema_version: schemaVersion,
    description: description,
    is_active: true,
  } satisfies IEcommerceMetadataRegistry.ICreate;
  const metadataRegistry =
    await api.functional.ecommerce.superAdministrator.metadata_registries.create(
      superAdminConnection,
      { body: createBody },
    );
  // 4. Validate response with typia.assert (complete validation)
  typia.assert(metadataRegistry);
  // 5. Business logic validation using TestValidator
  TestValidator.equals(
    "schema_name matches",
    metadataRegistry.schema_name,
    schemaName,
  );
  TestValidator.equals(
    "schema_version matches",
    metadataRegistry.schema_version,
    schemaVersion,
  );
  TestValidator.equals(
    "description matches",
    metadataRegistry.description,
    description,
  );
  TestValidator.predicate(
    "is_active is true",
    metadataRegistry.is_active === true,
  );
  // 6. Validate optional relationship fields are null or undefined (business logic)
  TestValidator.predicate(
    "system_setting is null/undefined",
    metadataRegistry.system_setting === null ||
      metadataRegistry.system_setting === undefined,
  );
  TestValidator.predicate(
    "audit_log is null/undefined",
    metadataRegistry.audit_log === null ||
      metadataRegistry.audit_log === undefined,
  );
  TestValidator.predicate(
    "db_migration is null/undefined",
    metadataRegistry.db_migration === null ||
      metadataRegistry.db_migration === undefined,
  );
}
