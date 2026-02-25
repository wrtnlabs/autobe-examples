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
 * Test pagination edge cases for field definition searching.
 * Test various pagination scenarios including boundary conditions
 * and maximum limits using existing field definitions.
 */
export async function test_api_metadata_registry_field_definitions_search_pagination_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test1234",
    } satisfies IEcommerceAdministrator.IJoin,
  });
  typia.assert(admin);
  // 2. Create metadata registry using utility function
  const registry =
    await generate_random_ecommerce_administrator_metadata_registries_create(
      adminConnection,
      {
        body: {
          schema_name: "pagination_test_registry",
          schema_version: "1.0.0",
          description: "Test registry for pagination edge cases",
          is_active: true,
        } satisfies IEcommerceMetadataRegistry.ICreate,
      },
    );
  typia.assert(registry);
  // 3. Test pagination with 5 records per page
  const page1Results5 =
    await api.functional.ecommerce.administrator.metadata_registries.field_definitions.index(
      adminConnection,
      {
        registryId: registry.id,
        body: {
          limit: 5,
          page: 1,
        } satisfies IEcommerceMetadataRegistryFieldDefinition.IRequest,
      },
    );
  typia.assert(page1Results5);
  TestValidator.equals(
    "page 1 with limit 5 has correct pagination",
    page1Results5.pagination.current,
    1,
  );
  const page2Results5 =
    await api.functional.ecommerce.administrator.metadata_registries.field_definitions.index(
      adminConnection,
      {
        registryId: registry.id,
        body: {
          limit: 5,
          page: 2,
        } satisfies IEcommerceMetadataRegistryFieldDefinition.IRequest,
      },
    );
  typia.assert(page2Results5);
  // 4. Test pagination with 10 records per page
  const page1Results10 =
    await api.functional.ecommerce.administrator.metadata_registries.field_definitions.index(
      adminConnection,
      {
        registryId: registry.id,
        body: {
          limit: 10,
          page: 1,
        } satisfies IEcommerceMetadataRegistryFieldDefinition.IRequest,
      },
    );
  typia.assert(page1Results10);
  const page2Results10 =
    await api.functional.ecommerce.administrator.metadata_registries.field_definitions.index(
      adminConnection,
      {
        registryId: registry.id,
        body: {
          limit: 10,
          page: 2,
        } satisfies IEcommerceMetadataRegistryFieldDefinition.IRequest,
      },
    );
  typia.assert(page2Results10);
  // 5. Test boundary condition: high page number with reasonable limit
  const highPageResults =
    await api.functional.ecommerce.administrator.metadata_registries.field_definitions.index(
      adminConnection,
      {
        registryId: registry.id,
        body: {
          limit: 10,
          page: 100,
        } satisfies IEcommerceMetadataRegistryFieldDefinition.IRequest,
      },
    );
  typia.assert(highPageResults);
  TestValidator.predicate(
    "high page number returns valid pagination structure",
    highPageResults.pagination.current === 100,
  );
  // 6. Test maximum limit: 100 records per page
  const maxLimitResults =
    await api.functional.ecommerce.administrator.metadata_registries.field_definitions.index(
      adminConnection,
      {
        registryId: registry.id,
        body: {
          limit: 100,
          page: 1,
        } satisfies IEcommerceMetadataRegistryFieldDefinition.IRequest,
      },
    );
  typia.assert(maxLimitResults);
  TestValidator.predicate(
    "maximum limit 100 is respected",
    maxLimitResults.pagination.limit <= 100,
  );
  // 7. Test minimum limit: 1 record per page
  const minLimitResults =
    await api.functional.ecommerce.administrator.metadata_registries.field_definitions.index(
      adminConnection,
      {
        registryId: registry.id,
        body: {
          limit: 1,
          page: 1,
        } satisfies IEcommerceMetadataRegistryFieldDefinition.IRequest,
      },
    );
  typia.assert(minLimitResults);
  TestValidator.predicate(
    "minimum limit 1 works correctly",
    minLimitResults.pagination.limit >= 1,
  );
  // 8. Test pagination continuity with consecutive requests
  const firstPage =
    await api.functional.ecommerce.administrator.metadata_registries.field_definitions.index(
      adminConnection,
      {
        registryId: registry.id,
        body: {
          limit: 5,
          page: 1,
        } satisfies IEcommerceMetadataRegistryFieldDefinition.IRequest,
      },
    );
  typia.assert(firstPage);
  const secondPage =
    await api.functional.ecommerce.administrator.metadata_registries.field_definitions.index(
      adminConnection,
      {
        registryId: registry.id,
        body: {
          limit: 5,
          page: 2,
        } satisfies IEcommerceMetadataRegistryFieldDefinition.IRequest,
      },
    );
  typia.assert(secondPage);
  // Validate pagination metadata consistency
  TestValidator.predicate(
    "total records count is consistent",
    firstPage.pagination.records === secondPage.pagination.records,
  );
  TestValidator.predicate(
    "limit is consistent across pages",
    firstPage.pagination.limit === secondPage.pagination.limit,
  );
}
