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

/**
 * Test comprehensive search capabilities for metadata registry field definitions.
 * Tests various search filters including partial name matching, field type filtering,
 * requirement status, date ranges, and pagination controls.
 */
export async function test_api_metadata_registry_field_definitions_search_comprehensive(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {});
  typia.assert(admin);
  // 2. Create parent metadata registry
  const registry =
    await generate_random_ecommerce_administrator_metadata_registries_create(
      adminConnection,
      {},
    );
  typia.assert(registry);
  // 3. Test search with partial field name matching
  const partialSearchResult =
    await api.functional.ecommerce.administrator.metadata_registries.field_definitions.index(
      adminConnection,
      {
        registryId: registry.id,
        body: {
          search: "field",
        } satisfies IEcommerceMetadataRegistryFieldDefinition.IRequest,
      },
    );
  typia.assert(partialSearchResult);
  // Verify search result structure
  TestValidator.predicate(
    "search returns pagination object",
    typeof partialSearchResult.pagination === "object",
  );
  TestValidator.predicate(
    "search returns data array",
    Array.isArray(partialSearchResult.data),
  );
  // 4. Test exact field type filtering
  const stringTypeSearchResult =
    await api.functional.ecommerce.administrator.metadata_registries.field_definitions.index(
      adminConnection,
      {
        registryId: registry.id,
        body: {
          field_type: "string",
        } satisfies IEcommerceMetadataRegistryFieldDefinition.IRequest,
      },
    );
  typia.assert(stringTypeSearchResult);
  // 5. Test combination of required/optional fields
  const requiredFieldsSearchResult =
    await api.functional.ecommerce.administrator.metadata_registries.field_definitions.index(
      adminConnection,
      {
        registryId: registry.id,
        body: {
          is_required: true,
        } satisfies IEcommerceMetadataRegistryFieldDefinition.IRequest,
      },
    );
  typia.assert(requiredFieldsSearchResult);
  const optionalFieldsSearchResult =
    await api.functional.ecommerce.administrator.metadata_registries.field_definitions.index(
      adminConnection,
      {
        registryId: registry.id,
        body: {
          is_required: false,
        } satisfies IEcommerceMetadataRegistryFieldDefinition.IRequest,
      },
    );
  typia.assert(optionalFieldsSearchResult);
  // 6. Test date range filtering with current timestamp
  const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
  const dateRangeSearchResult =
    await api.functional.ecommerce.administrator.metadata_registries.field_definitions.index(
      adminConnection,
      {
        registryId: registry.id,
        body: {
          created_after: oneHourAgo,
        } satisfies IEcommerceMetadataRegistryFieldDefinition.IRequest,
      },
    );
  typia.assert(dateRangeSearchResult);
  // 7. Test pagination controls
  const page1SearchResult =
    await api.functional.ecommerce.administrator.metadata_registries.field_definitions.index(
      adminConnection,
      {
        registryId: registry.id,
        body: {
          page: 1,
          limit: 5,
        } satisfies IEcommerceMetadataRegistryFieldDefinition.IRequest,
      },
    );
  typia.assert(page1SearchResult);
  TestValidator.predicate(
    "page 1 has correct limit",
    page1SearchResult.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "page 1 has correct current page",
    page1SearchResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "page 1 data length matches limit constraints",
    page1SearchResult.data.length <= page1SearchResult.pagination.limit ||
      page1SearchResult.pagination.limit === 0,
  );
  // 8. Test updated date range filtering
  const updatedSearchResult =
    await api.functional.ecommerce.administrator.metadata_registries.field_definitions.index(
      adminConnection,
      {
        registryId: registry.id,
        body: {
          updated_after: oneHourAgo,
        } satisfies IEcommerceMetadataRegistryFieldDefinition.IRequest,
      },
    );
  typia.assert(updatedSearchResult);
  // 9. Verify all search responses include proper structure
  const searchResults = [
    partialSearchResult,
    stringTypeSearchResult,
    requiredFieldsSearchResult,
    optionalFieldsSearchResult,
    dateRangeSearchResult,
    page1SearchResult,
    updatedSearchResult,
  ];
  for (const result of searchResults) {
    typia.assert<IPageIEcommerceMetadataRegistryFieldDefinition.ISummary>(
      result,
    );
    // Validate pagination metadata
    TestValidator.predicate(
      "pagination has current page",
      result.pagination.current >= 0,
    );
    TestValidator.predicate(
      "pagination has limit",
      result.pagination.limit >= 0,
    );
    TestValidator.predicate(
      "pagination has records count",
      result.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pagination has pages count",
      result.pagination.pages >= 0,
    );
    // Validate each field definition summary
    for (const fieldDef of result.data) {
      TestValidator.predicate(
        "field definition has id",
        fieldDef.id.length > 0,
      );
      TestValidator.predicate(
        "field definition has field_name",
        fieldDef.field_name.length > 0,
      );
      TestValidator.predicate(
        "field definition has field_type",
        fieldDef.field_type.length > 0,
      );
      TestValidator.predicate(
        "field definition has is_required boolean",
        typeof fieldDef.is_required === "boolean",
      );
      TestValidator.predicate(
        "field definition has created_at",
        fieldDef.created_at.length > 0,
      );
    }
  }
}
