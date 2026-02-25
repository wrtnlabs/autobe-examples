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

export async function test_api_administrator_user_management_comprehensive_search(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // Test 1: Search for all user types without filters
  const allUsers =
    await api.functional.ecommerce.administrator.user_management.index(
      adminConnection,
      {
        body: {} satisfies IEcommerceMetadataRegistryRelationship.IRequest,
      },
    );
  typia.assert(allUsers);
  TestValidator.predicate(
    "has pagination data",
    allUsers.pagination !== undefined,
  );
  // Test 2: Search for specific user type - administrators
  const adminResults =
    await api.functional.ecommerce.administrator.user_management.index(
      adminConnection,
      {
        body: {
          userType: "administrator",
        } satisfies IEcommerceMetadataRegistryRelationship.IRequest,
      },
    );
  typia.assert(adminResults);
  // Test 3: Search for specific user type - customers
  const customerResults =
    await api.functional.ecommerce.administrator.user_management.index(
      adminConnection,
      {
        body: {
          userType: "customer",
        } satisfies IEcommerceMetadataRegistryRelationship.IRequest,
      },
    );
  typia.assert(customerResults);
  // Test 4: Search for specific user type - sellers
  const sellerResults =
    await api.functional.ecommerce.administrator.user_management.index(
      adminConnection,
      {
        body: {
          userType: "seller",
        } satisfies IEcommerceMetadataRegistryRelationship.IRequest,
      },
    );
  typia.assert(sellerResults);
  // Test 5: Search for specific user type - super administrators
  const superAdminResults =
    await api.functional.ecommerce.administrator.user_management.index(
      adminConnection,
      {
        body: {
          userType: "superAdministrator",
        } satisfies IEcommerceMetadataRegistryRelationship.IRequest,
      },
    );
  typia.assert(superAdminResults);
  // Test 6: Test account status filtering
  const activeUsers =
    await api.functional.ecommerce.administrator.user_management.index(
      adminConnection,
      {
        body: {
          accountStatus: "active",
        } satisfies IEcommerceMetadataRegistryRelationship.IRequest,
      },
    );
  typia.assert(activeUsers);
  // Test 7: Test text-based search
  const searchResults =
    await api.functional.ecommerce.administrator.user_management.index(
      adminConnection,
      {
        body: {
          search: "test",
        } satisfies IEcommerceMetadataRegistryRelationship.IRequest,
      },
    );
  typia.assert(searchResults);
  // Test 8: Test date range filtering
  const recentUsers =
    await api.functional.ecommerce.administrator.user_management.index(
      adminConnection,
      {
        body: {
          createdAt_from: new Date(
            Date.now() - 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        } satisfies IEcommerceMetadataRegistryRelationship.IRequest,
      },
    );
  typia.assert(recentUsers);
  // Test 9: Test pagination
  const paginatedResults =
    await api.functional.ecommerce.administrator.user_management.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceMetadataRegistryRelationship.IRequest,
      },
    );
  typia.assert(paginatedResults);
  TestValidator.predicate(
    "page number valid",
    paginatedResults.pagination.current === 1,
  );
  TestValidator.predicate(
    "limit valid",
    paginatedResults.pagination.limit === 10,
  );
  TestValidator.predicate(
    "records count valid",
    paginatedResults.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count valid",
    paginatedResults.pagination.pages >= 0,
  );
  // Test 10: Test combination of filters
  const combinedSearch =
    await api.functional.ecommerce.administrator.user_management.index(
      adminConnection,
      {
        body: {
          userType: "administrator",
          accountStatus: "active",
          search: "admin",
          createdAt_from: new Date(
            Date.now() - 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          page: 1,
          limit: 5,
        } satisfies IEcommerceMetadataRegistryRelationship.IRequest,
      },
    );
  typia.assert(combinedSearch);
  // Test 11: Test empty result scenario
  const emptySearch =
    await api.functional.ecommerce.administrator.user_management.index(
      adminConnection,
      {
        body: {
          userType: "customer",
          search: "nonexistent-user-12345",
        } satisfies IEcommerceMetadataRegistryRelationship.IRequest,
      },
    );
  typia.assert(emptySearch);
  TestValidator.predicate(
    "empty search returns valid structure",
    emptySearch.pagination.records >= 0 && Array.isArray(emptySearch.data),
  );
}
