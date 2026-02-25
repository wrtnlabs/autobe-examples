import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMetadataRegistryFieldDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistryFieldDefinition";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMetadataRegistryFieldDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMetadataRegistryFieldDefinition";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

/**
 * Test super administrator search for field definitions that return empty results.
 *
 * Tests various search scenarios where no field definitions should match the criteria,
 * validating that the API gracefully handles empty result sets with proper pagination
 * structure and metadata.
 */
export async function test_api_metadata_registry_field_definitions_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // Create a registry ID for testing
  const registryId = typia.random<string & tags.Format<"uuid">>();
  // Test search with non-existent field name
  const searchResult1 =
    await api.functional.ecommerce.superAdministrator.metadata_registries.field_definitions.index(
      connection,
      {
        registryId,
        body: {
          search: "xyz123nonexistent",
        } satisfies IEcommerceMetadataRegistryFieldDefinition.IRequest,
      },
    );
  typia.assert(searchResult1);
  // Validate empty data array and pagination
  TestValidator.equals(
    "empty data array for non-existent search",
    searchResult1.data,
    [],
  );
  TestValidator.equals(
    "records should be 0 for non-existent search",
    searchResult1.pagination.records,
    0,
  );
  TestValidator.equals(
    "pages should be 0 for non-existent search",
    searchResult1.pagination.pages,
    0,
  );
  // Test search with non-matching field_type
  const searchResult2 =
    await api.functional.ecommerce.superAdministrator.metadata_registries.field_definitions.index(
      connection,
      {
        registryId,
        body: {
          field_type: "nonexistent_type",
        } satisfies IEcommerceMetadataRegistryFieldDefinition.IRequest,
      },
    );
  typia.assert(searchResult2);
  TestValidator.equals(
    "empty data array for non-matching field_type",
    searchResult2.data,
    [],
  );
  TestValidator.equals(
    "records should be 0 for non-matching field_type",
    searchResult2.pagination.records,
    0,
  );
  // Test search with created_after date far in future
  const futureDate = typia.random<string & tags.Format<"date-time">>();
  const searchResult3 =
    await api.functional.ecommerce.superAdministrator.metadata_registries.field_definitions.index(
      connection,
      {
        registryId,
        body: {
          created_after: futureDate,
        } satisfies IEcommerceMetadataRegistryFieldDefinition.IRequest,
      },
    );
  typia.assert(searchResult3);
  TestValidator.equals(
    "empty data array for future created_after",
    searchResult3.data,
    [],
  );
  TestValidator.equals(
    "records should be 0 for future created_after",
    searchResult3.pagination.records,
    0,
  );
  // Test search with extremely restrictive date range
  const recentDate = typia.random<string & tags.Format<"date-time">>();
  const searchResult4 =
    await api.functional.ecommerce.superAdministrator.metadata_registries.field_definitions.index(
      connection,
      {
        registryId,
        body: {
          created_after: recentDate,
          created_before: futureDate,
        } satisfies IEcommerceMetadataRegistryFieldDefinition.IRequest,
      },
    );
  typia.assert(searchResult4);
  TestValidator.equals(
    "empty data array for restrictive date range",
    searchResult4.data,
    [],
  );
  TestValidator.equals(
    "records should be 0 for restrictive date range",
    searchResult4.pagination.records,
    0,
  );
  // Validate response structure integrity even with empty results
  TestValidator.predicate(
    "pagination current should be valid",
    searchResult1.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit should be valid",
    searchResult1.pagination.limit > 0,
  );
}
