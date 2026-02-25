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
 * Test cursor-based pagination for metadata registry field definitions.
 *
 * This test validates that the pagination system correctly handles:
 * - Standard pagination with various page sizes
 * - Edge cases including pages beyond total count
 * - Filtered searches combined with pagination
 * - Business logic consistency across pagination requests
 */
export async function test_api_metadata_registry_field_definitions_pagination_cursor(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as super administrator using utility function
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  typia.assert(superAdmin);
  // Step 2: Test basic pagination functionality
  const registryId = typia.random<string & tags.Format<"uuid">>();
  // Test 1: Basic pagination request without filters
  const firstPage =
    await api.functional.ecommerce.superAdministrator.metadata_registries.field_definitions.index(
      superAdminConnection,
      {
        registryId,
        body: {
          page: 1,
          limit: 50,
        } satisfies IEcommerceMetadataRegistryFieldDefinition.IRequest,
      },
    );
  typia.assert(firstPage);
  // Validate pagination metadata structure
  TestValidator.equals(
    "first page current page",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals("first page limit", firstPage.pagination.limit, 50);
  TestValidator.predicate(
    "records should be non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages should be non-negative",
    firstPage.pagination.pages >= 0,
  );
  // Test 2: Second page request
  const secondPage =
    await api.functional.ecommerce.superAdministrator.metadata_registries.field_definitions.index(
      superAdminConnection,
      {
        registryId,
        body: {
          page: 2,
          limit: 50,
        } satisfies IEcommerceMetadataRegistryFieldDefinition.IRequest,
      },
    );
  typia.assert(secondPage);
  TestValidator.equals(
    "second page current page",
    secondPage.pagination.current,
    2,
  );
  TestValidator.equals("second page limit", secondPage.pagination.limit, 50);
  TestValidator.equals(
    "total records consistent",
    secondPage.pagination.records,
    firstPage.pagination.records,
  );
  // Test 3: Edge case - page beyond total pages
  const beyondPage =
    await api.functional.ecommerce.superAdministrator.metadata_registries.field_definitions.index(
      superAdminConnection,
      {
        registryId,
        body: {
          page: 999, // Large page number beyond likely total
          limit: 50,
        } satisfies IEcommerceMetadataRegistryFieldDefinition.IRequest,
      },
    );
  typia.assert(beyondPage);
  TestValidator.predicate(
    "beyond page should have valid pagination",
    beyondPage.pagination.current >= 1,
  );
  // Test 4: Maximum allowed limit
  const maxLimitPage =
    await api.functional.ecommerce.superAdministrator.metadata_registries.field_definitions.index(
      superAdminConnection,
      {
        registryId,
        body: {
          page: 1,
          limit: 100,
        } satisfies IEcommerceMetadataRegistryFieldDefinition.IRequest,
      },
    );
  typia.assert(maxLimitPage);
  TestValidator.equals(
    "max limit page limit",
    maxLimitPage.pagination.limit,
    100,
  );
  // Test 5: Minimum limit
  const minLimitPage =
    await api.functional.ecommerce.superAdministrator.metadata_registries.field_definitions.index(
      superAdminConnection,
      {
        registryId,
        body: {
          page: 1,
          limit: 1,
        } satisfies IEcommerceMetadataRegistryFieldDefinition.IRequest,
      },
    );
  typia.assert(minLimitPage);
  TestValidator.equals(
    "min limit page limit",
    minLimitPage.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "min limit should have valid data length",
    minLimitPage.data.length >= 0,
  );
  // Test 6: Filter combination with pagination
  const filteredPage =
    await api.functional.ecommerce.superAdministrator.metadata_registries.field_definitions.index(
      superAdminConnection,
      {
        registryId,
        body: {
          field_type: "boolean",
          page: 1,
          limit: 20,
        } satisfies IEcommerceMetadataRegistryFieldDefinition.IRequest,
      },
    );
  typia.assert(filteredPage);
  TestValidator.predicate(
    "filtered pagination should work correctly",
    filteredPage.pagination.current === 1,
  );
  TestValidator.equals(
    "filtered page limit",
    filteredPage.pagination.limit,
    20,
  );
  // Test 7: Business logic consistency - repeated requests
  const repeatTest1 =
    await api.functional.ecommerce.superAdministrator.metadata_registries.field_definitions.index(
      superAdminConnection,
      {
        registryId,
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceMetadataRegistryFieldDefinition.IRequest,
      },
    );
  typia.assert(repeatTest1);
  const repeatTest2 =
    await api.functional.ecommerce.superAdministrator.metadata_registries.field_definitions.index(
      superAdminConnection,
      {
        registryId,
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceMetadataRegistryFieldDefinition.IRequest,
      },
    );
  typia.assert(repeatTest2);
  // Consistency validation
  TestValidator.equals(
    "repeated requests should have same structure",
    repeatTest1.pagination.records,
    repeatTest2.pagination.records,
  );
}
