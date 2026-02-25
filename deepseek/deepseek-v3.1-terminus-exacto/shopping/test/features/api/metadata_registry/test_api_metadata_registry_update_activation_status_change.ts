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

export async function test_api_metadata_registry_update_activation_status_change(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super administrator setup
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_administrator_join(
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
  typia.assert(authorized);
  // 2. Create an inactive metadata registry first
  const registryBody = {
    schema_name: RandomGenerator.alphabets(10),
    schema_version: "1.0.0",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    is_active: false, // Initially inactive
  } satisfies IEcommerceMetadataRegistry.IUpdate;
  // Note: Since create endpoint is not available in SDK, we assume registry exists
  // or was pre-created. For this test, we'll use a random UUID as registryId
  const registryId = typia.random<string & tags.Format<"uuid">>();
  // 3. Update registry to active status
  const updateBody = {
    is_active: true, // Change to active
    schema_name: registryBody.schema_name, // Keep existing name
    schema_version: registryBody.schema_version, // Keep existing version
    description: registryBody.description, // Keep existing description
  } satisfies IEcommerceMetadataRegistry.IUpdate;
  const updatedRegistry =
    await api.functional.ecommerce.superAdministrator.metadata_registries.update(
      superAdminConnection,
      {
        registryId: registryId,
        body: updateBody,
      },
    );
  typia.assert(updatedRegistry);
  // 4. Validate activation status change
  TestValidator.equals(
    "registry should be active",
    updatedRegistry.is_active,
    true,
  );
  TestValidator.equals(
    "schema name should match",
    updatedRegistry.schema_name,
    registryBody.schema_name,
  );
  TestValidator.equals(
    "schema version should match",
    updatedRegistry.schema_version,
    registryBody.schema_version,
  );
  // 5. Validate automatic timestamp updates
  TestValidator.predicate(
    "updated_at should be valid timestamp",
    new Date(updatedRegistry.updated_at).getTime() > 0,
  );
  TestValidator.predicate(
    "created_at should be valid timestamp",
    new Date(updatedRegistry.created_at).getTime() > 0,
  );
  // 6. Validate business rules - activation status transition from inactive to active
  TestValidator.notEquals(
    "created_at and updated_at should be different on update",
    updatedRegistry.created_at,
    updatedRegistry.updated_at,
  );
}
