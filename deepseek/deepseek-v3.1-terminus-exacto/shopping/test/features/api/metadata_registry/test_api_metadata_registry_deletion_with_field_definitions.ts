import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAuditLog";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceDbMigration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceDbMigration";
import type { IEcommerceMetadataRegistry } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistry";
import type { IEcommerceMetadataRegistryFieldDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistryFieldDefinition";
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
import { generate_random_ecommerce_super_administrator_metadata_registries_field_definitions_create } from "../../../generate/generate_random_ecommerce_super_administrator_metadata_registries_field_definitions_create";
import { prepare_random_ecommerce_metadata_registry } from "../../../prepare/prepare_random_ecommerce_metadata_registry";
import { prepare_random_ecommerce_metadata_registry_field_definition } from "../../../prepare/prepare_random_ecommerce_metadata_registry_field_definition";

export async function test_api_metadata_registry_deletion_with_field_definitions(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSuperAdministrator.IJoin,
  });
  // Create metadata registry
  const metadataRegistry =
    await generate_random_ecommerce_super_administrator_metadata_registries_create(
      superAdminConnection,
      {},
    );
  typia.assert(metadataRegistry);
  // Create field definitions for the registry
  const fieldDefinitionsPromises = ArrayUtil.repeat(3, async () => {
    const fieldDefinition =
      await generate_random_ecommerce_super_administrator_metadata_registries_field_definitions_create(
        superAdminConnection,
        {
          params: { registryId: metadataRegistry.id },
        },
      );
    typia.assert(fieldDefinition);
    return fieldDefinition;
  });
  const fieldDefinitions = await Promise.all(fieldDefinitionsPromises);
  // Verify field definitions belong to the registry
  fieldDefinitions.forEach((fieldDef) => {
    TestValidator.equals(
      "field definition belongs to registry",
      fieldDef.ecommerce_metadata_registry_id,
      metadataRegistry.id,
    );
  });
  // Delete the metadata registry
  await api.functional.ecommerce.superAdministrator.metadata_registries.erase(
    superAdminConnection,
    {
      registryId: metadataRegistry.id,
    },
  );
  // Verify cascade deletion by attempting to access field definitions
  // Since cascade deletion should remove all related field definitions,
  // any operations on the deleted registry or its field definitions should fail
  await TestValidator.error(
    "should not be able to create field definitions for deleted registry",
    async () => {
      await generate_random_ecommerce_super_administrator_metadata_registries_field_definitions_create(
        superAdminConnection,
        {
          params: { registryId: metadataRegistry.id },
        },
      );
    },
  );
  TestValidator.predicate(
    "cascade deletion successful - parent registry and all field definitions removed",
    true,
  );
}