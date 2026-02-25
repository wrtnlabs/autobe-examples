import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceMetadataRegistryRelationship } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistryRelationship";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
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

export async function test_api_metadata_registry_relationship_subtypes_search_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication setup
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "AdminPassword123!",
    } satisfies IEcommerceAdministrator.IJoin,
  });
  typia.assert(admin);
  // 2. Generate random IDs for registry and relationship
  const registryId = typia.random<string & tags.Format<"uuid">>();
  const relationshipId = typia.random<string & tags.Format<"uuid">>();
  // 3. Test search with all filters null (default pagination)
  const defaultSearch =
    await api.functional.ecommerce.administrator.metadata_registries.relationships.subtypes.search(
      adminConnection,
      {
        registryId,
        relationshipId,
        body: {
          userType: null,
          accountStatus: null,
          search: null,
          createdAt_from: null,
          createdAt_to: null,
          page: 1,
          limit: 10,
        } satisfies IEcommerceMetadataRegistryRelationship.IRequest,
      },
    );
  typia.assert(defaultSearch);
  TestValidator.equals(
    "default search pagination structure",
    typeof defaultSearch.pagination,
    "object",
  );
  TestValidator.predicate(
    "has valid page data",
    Array.isArray(defaultSearch.data),
  );
  // 4. Test search with specific user type filter
  const userTypeSearch =
    await api.functional.ecommerce.administrator.metadata_registries.relationships.subtypes.search(
      adminConnection,
      {
        registryId,
        relationshipId,
        body: {
          userType: "administrator" as const,
          accountStatus: null,
          search: null,
          createdAt_from: null,
          createdAt_to: null,
          page: 1,
          limit: 20,
        } satisfies IEcommerceMetadataRegistryRelationship.IRequest,
      },
    );
  typia.assert(userTypeSearch);
  TestValidator.predicate(
    "userType search returns valid structure",
    userTypeSearch.pagination.limit === 20,
  );
  // 5. Test search with account status filter
  const statusSearch =
    await api.functional.ecommerce.administrator.metadata_registries.relationships.subtypes.search(
      adminConnection,
      {
        registryId,
        relationshipId,
        body: {
          userType: null,
          accountStatus: "active" as const,
          search: null,
          createdAt_from: null,
          createdAt_to: null,
          page: 2,
          limit: 5,
        } satisfies IEcommerceMetadataRegistryRelationship.IRequest,
      },
    );
  typia.assert(statusSearch);
  TestValidator.predicate(
    "status search returns valid structure",
    statusSearch.pagination.current === 2,
  );
  // 6. Test search with text search filter
  const textSearch =
    await api.functional.ecommerce.administrator.metadata_registries.relationships.subtypes.search(
      adminConnection,
      {
        registryId,
        relationshipId,
        body: {
          userType: null,
          accountStatus: null,
          search: "test",
          createdAt_from: null,
          createdAt_to: null,
          page: 1,
          limit: 15,
        } satisfies IEcommerceMetadataRegistryRelationship.IRequest,
      },
    );
  typia.assert(textSearch);
  TestValidator.predicate(
    "text search returns valid structure",
    textSearch.pagination.limit === 15,
  );
  // 7. Test search with date range filters
  const dateFrom = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const dateTo = new Date().toISOString();
  const dateSearch =
    await api.functional.ecommerce.administrator.metadata_registries.relationships.subtypes.search(
      adminConnection,
      {
        registryId,
        relationshipId,
        body: {
          userType: null,
          accountStatus: null,
          search: null,
          createdAt_from: dateFrom,
          createdAt_to: dateTo,
          page: 1,
          limit: 25,
        } satisfies IEcommerceMetadataRegistryRelationship.IRequest,
      },
    );
  typia.assert(dateSearch);
  TestValidator.predicate(
    "date range search returns valid structure",
    dateSearch.pagination.limit === 25,
  );
  // 8. Test search with combination of filters
  const combinedSearch =
    await api.functional.ecommerce.administrator.metadata_registries.relationships.subtypes.search(
      adminConnection,
      {
        registryId,
        relationshipId,
        body: {
          userType: "seller" as const,
          accountStatus: "pending" as const,
          search: "shop",
          createdAt_from: dateFrom,
          createdAt_to: dateTo,
          page: 1,
          limit: 30,
        } satisfies IEcommerceMetadataRegistryRelationship.IRequest,
      },
    );
  typia.assert(combinedSearch);
  TestValidator.predicate(
    "combined search returns valid structure",
    combinedSearch.pagination.limit === 30,
  );
  // 9. Validate response integrity for all searches
  const searches = [
    defaultSearch,
    userTypeSearch,
    statusSearch,
    textSearch,
    dateSearch,
    combinedSearch,
  ];
  searches.forEach((result, index) => {
    TestValidator.predicate(
      `search ${index + 1} has pagination metadata`,
      result.pagination.current >= 0 && result.pagination.limit > 0,
    );
    TestValidator.predicate(
      `search ${index + 1} has valid data array`,
      Array.isArray(result.data),
    );
  });
}
