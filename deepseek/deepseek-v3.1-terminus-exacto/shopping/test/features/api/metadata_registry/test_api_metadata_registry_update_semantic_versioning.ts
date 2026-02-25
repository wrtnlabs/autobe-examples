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

export async function test_api_metadata_registry_update_semantic_versioning(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection and register admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await api.functional.ecommerce.auth.administrator.join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IEcommerceAdministrator.IJoin,
    },
  );
  typia.assert(admin);
  // Create base metadata registry for testing
  const registry =
    await generate_random_ecommerce_administrator_metadata_registries_create(
      adminConnection,
      {
        body: {
          schema_name: RandomGenerator.alphabets(8),
          schema_version: "1.0.0",
          description: "Base registry for version testing",
          is_active: true,
        } satisfies IEcommerceMetadataRegistry.ICreate,
      },
    );
  typia.assert(registry);
  // Validate initial registry creation
  TestValidator.equals(
    "initial registry should have correct version",
    registry.schema_version,
    "1.0.0",
  );
  // Test valid semantic versions
  const validVersions = [
    "1.0.0",
    "2.1.5",
    "3.0.0-beta.1",
    "4.5.6-rc.2+build.123",
  ];
  for (const version of validVersions) {
    const updated =
      await api.functional.ecommerce.administrator.metadata_registries.update(
        adminConnection,
        {
          registryId: registry.id,
          body: {
            schema_version: version,
          } satisfies IEcommerceMetadataRegistry.IUpdate,
        },
      );
    typia.assert(updated);
    TestValidator.equals(
      `version ${version} should be accepted`,
      updated.schema_version,
      version,
    );
    // Reset to original version for next test
    await api.functional.ecommerce.administrator.metadata_registries.update(
      adminConnection,
      {
        registryId: registry.id,
        body: {
          schema_version: "1.0.0",
        } satisfies IEcommerceMetadataRegistry.IUpdate,
      },
    );
  }
  // Test invalid versions that should be rejected
  const invalidVersions = [
    "not.a.version",
    "1.0",
    "1.0.0.0",
    "1.0.0-",
    "1.0.0-beta.",
    "v1.0.0",
    "1.a.0",
    "1.0.0+invalid@char",
  ];
  for (const version of invalidVersions) {
    await TestValidator.error(
      `invalid version ${version} should be rejected`,
      async () => {
        await api.functional.ecommerce.administrator.metadata_registries.update(
          adminConnection,
          {
            registryId: registry.id,
            body: {
              schema_version: version,
            } satisfies IEcommerceMetadataRegistry.IUpdate,
          },
        );
      },
    );
  }
  // Verify original data integrity after invalid attempts
  const finalRegistry =
    await api.functional.ecommerce.administrator.metadata_registries.update(
      adminConnection,
      {
        registryId: registry.id,
        body: {
          schema_version: "2.0.0",
        } satisfies IEcommerceMetadataRegistry.IUpdate,
      },
    );
  typia.assert(finalRegistry);
  TestValidator.equals(
    "registry should still be updatable with valid version",
    finalRegistry.schema_version,
    "2.0.0",
  );
  TestValidator.equals(
    "original schema name should be preserved",
    finalRegistry.schema_name,
    registry.schema_name,
  );
  TestValidator.equals(
    "registry ID should remain the same",
    finalRegistry.id,
    registry.id,
  );
  TestValidator.predicate(
    "registry should remain active",
    finalRegistry.is_active === true,
  );
}
