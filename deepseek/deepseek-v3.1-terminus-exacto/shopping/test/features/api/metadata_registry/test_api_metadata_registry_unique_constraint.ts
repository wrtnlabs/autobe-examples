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

/**
 * Test metadata registry unique constraint enforcement for schema_name and schema_version combination.
 * Verify the system properly rejects duplicate entries violating the unique constraint.
 */
export async function test_api_metadata_registry_unique_constraint(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSuperAdministrator.IJoin,
  });
  // 2. Create first metadata registry entry
  const commonSchemaName = RandomGenerator.alphaNumeric(10);
  const commonSchemaVersion = "1.0.0";
  const firstRegistry =
    await generate_random_ecommerce_super_administrator_metadata_registries_create(
      adminConnection,
      {
        body: {
          schema_name: commonSchemaName,
          schema_version: commonSchemaVersion,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          is_active: true,
        },
      },
    );
  typia.assert(firstRegistry);
  // 3. Validate first entry was created successfully
  TestValidator.equals(
    "schema name matches",
    firstRegistry.schema_name,
    commonSchemaName,
  );
  TestValidator.equals(
    "schema version matches",
    firstRegistry.schema_version,
    commonSchemaVersion,
  );
  // 4. Attempt to create duplicate entry with same schema name and version
  await TestValidator.error(
    "duplicate schema_name and schema_version combination",
    async () => {
      await generate_random_ecommerce_super_administrator_metadata_registries_create(
        adminConnection,
        {
          body: {
            schema_name: commonSchemaName,
            schema_version: commonSchemaVersion,
            description: RandomGenerator.paragraph({ sentences: 2 }),
            is_active: false,
          },
        },
      );
    },
  );
}
