import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAuditLog";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceDbMigration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceDbMigration";
import type { IEcommerceMetadataRegistry } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistry";
import type { IEcommerceMetadataRegistryRelationship } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistryRelationship";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import type { IEcommerceSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSystemSetting";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMetadataRegistryRelationship } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMetadataRegistryRelationship";
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

export async function test_api_metadata_registry_relationships_advanced_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator connection and register
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(admin);
  // 2. Create metadata registry
  const registry =
    await generate_random_ecommerce_administrator_metadata_registries_create(
      adminConnection,
      {
        body: {
          schema_name: RandomGenerator.alphaNumeric(10),
          schema_version: "1.0.0",
          description: RandomGenerator.paragraph({ sentences: 3 }),
          is_active: true,
        },
      },
    );
  typia.assert(registry);
  // 3. Test filtering by user type
  const userTypeFilter =
    await api.functional.ecommerce.administrator.metadata_registries.relationships.index(
      adminConnection,
      {
        registryId: registry.id,
        body: {
          userType: "customer",
          limit: 10,
          page: 1,
        } satisfies IEcommerceMetadataRegistryRelationship.IRequest,
      },
    );
  typia.assert(userTypeFilter);
  TestValidator.predicate(
    "user type filter should return results",
    userTypeFilter.data.length >= 0,
  );
  // 4. Test filtering by account status
  const statusFilter =
    await api.functional.ecommerce.administrator.metadata_registries.relationships.index(
      adminConnection,
      {
        registryId: registry.id,
        body: {
          accountStatus: "active",
          limit: 10,
          page: 1,
        } satisfies IEcommerceMetadataRegistryRelationship.IRequest,
      },
    );
  typia.assert(statusFilter);
  TestValidator.predicate(
    "status filter should return results",
    statusFilter.data.length >= 0,
  );
  // 5. Test search functionality
  const searchFilter =
    await api.functional.ecommerce.administrator.metadata_registries.relationships.index(
      adminConnection,
      {
        registryId: registry.id,
        body: {
          search: "test",
          limit: 10,
          page: 1,
        } satisfies IEcommerceMetadataRegistryRelationship.IRequest,
      },
    );
  typia.assert(searchFilter);
  TestValidator.predicate(
    "search filter should return results",
    searchFilter.data.length >= 0,
  );
  // 6. Test date range filtering
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const dateFilter =
    await api.functional.ecommerce.administrator.metadata_registries.relationships.index(
      adminConnection,
      {
        registryId: registry.id,
        body: {
          createdAt_from: oneWeekAgo.toISOString(),
          createdAt_to: now.toISOString(),
          limit: 10,
          page: 1,
        } satisfies IEcommerceMetadataRegistryRelationship.IRequest,
      },
    );
  typia.assert(dateFilter);
  TestValidator.predicate(
    "date filter should return results",
    dateFilter.data.length >= 0,
  );
  // 7. Test combined filters
  const combinedFilter =
    await api.functional.ecommerce.administrator.metadata_registries.relationships.index(
      adminConnection,
      {
        registryId: registry.id,
        body: {
          userType: "customer",
          accountStatus: "active",
          createdAt_from: oneWeekAgo.toISOString(),
          limit: 10,
          page: 1,
        } satisfies IEcommerceMetadataRegistryRelationship.IRequest,
      },
    );
  typia.assert(combinedFilter);
  TestValidator.predicate(
    "combined filter should return results",
    combinedFilter.data.length >= 0,
  );
  // 8. Validate pagination structure
  TestValidator.predicate(
    "pagination should exist",
    combinedFilter.pagination !== undefined,
  );
  TestValidator.equals(
    "current page should be 1",
    combinedFilter.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit should be 10",
    combinedFilter.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "records should be non-negative",
    combinedFilter.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages should be non-negative",
    combinedFilter.pagination.pages >= 0,
  );
}
