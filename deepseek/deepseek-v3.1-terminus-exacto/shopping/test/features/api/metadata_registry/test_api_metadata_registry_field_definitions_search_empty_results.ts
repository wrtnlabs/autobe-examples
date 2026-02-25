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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMetadataRegistryFieldDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMetadataRegistryFieldDefinition";
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

export async function test_api_metadata_registry_field_definitions_search_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection and authenticate using direct SDK call
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await api.functional.ecommerce.auth.administrator.join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
      } satisfies IEcommerceAdministrator.IJoin,
    },
  );
  typia.assert(adminAuth);
  // Create a metadata registry for field definitions to belong to
  const registry =
    await api.functional.ecommerce.administrator.metadata_registries.create(
      adminConnection,
      {
        body: {
          schema_name: typia.random<string>(),
          schema_version: "1.0.0",
          description: typia.random<string>(),
          is_active: true,
        } satisfies IEcommerceMetadataRegistry.ICreate,
      },
    );
  typia.assert(registry);
  // Test 1: Search for field name that doesn't exist
  const searchResult1 =
    await api.functional.ecommerce.administrator.metadata_registries.field_definitions.index(
      adminConnection,
      {
        registryId: registry.id,
        body: {
          search: "nonexistent_field_name_12345",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMetadataRegistryFieldDefinition.IRequest,
      },
    );
  typia.assert(searchResult1);
  // Validate empty results with proper pagination
  TestValidator.equals("empty result data array", searchResult1.data, []);
  TestValidator.equals(
    "zero records in pagination",
    searchResult1.pagination.records,
    0,
  );
  TestValidator.equals(
    "current page should be 1",
    searchResult1.pagination.current,
    1,
  );
  TestValidator.equals("limit preserved", searchResult1.pagination.limit, 10);
  TestValidator.equals("zero total pages", searchResult1.pagination.pages, 0);
  // Test 2: Search for field type that doesn't exist
  const searchResult2 =
    await api.functional.ecommerce.administrator.metadata_registries.field_definitions.index(
      adminConnection,
      {
        registryId: registry.id,
        body: {
          field_type: "nonexistent_type_xyz",
          page: 1,
          limit: 5,
        } satisfies IEcommerceMetadataRegistryFieldDefinition.IRequest,
      },
    );
  typia.assert(searchResult2);
  // Validate empty results
  TestValidator.equals("empty result for type search", searchResult2.data, []);
  TestValidator.equals(
    "zero records for type search",
    searchResult2.pagination.records,
    0,
  );
  // Test 3: Case-sensitive mismatch (uppercase search when only lowercase exists)
  const searchResult3 =
    await api.functional.ecommerce.administrator.metadata_registries.field_definitions.index(
      adminConnection,
      {
        registryId: registry.id,
        body: {
          search: "UPPERCASE_FIELD_NAME",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMetadataRegistryFieldDefinition.IRequest,
      },
    );
  typia.assert(searchResult3);
  TestValidator.equals(
    "empty result for case mismatch",
    searchResult3.data,
    [],
  );
  // Test 4: Combination of search criteria that yields empty results
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 1); // Tomorrow's date
  const searchResult4 =
    await api.functional.ecommerce.administrator.metadata_registries.field_definitions.index(
      adminConnection,
      {
        registryId: registry.id,
        body: {
          search: "partial_match_pattern",
          field_type: "string",
          is_required: true,
          created_after: futureDate.toISOString(), // Future date - no records
          page: 1,
          limit: 10,
        } satisfies IEcommerceMetadataRegistryFieldDefinition.IRequest,
      },
    );
  typia.assert(searchResult4);
  TestValidator.equals(
    "empty result for combined criteria",
    searchResult4.data,
    [],
  );
  TestValidator.equals(
    "zero records for combined search",
    searchResult4.pagination.records,
    0,
  );
}
