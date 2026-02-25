import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceDataSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceDataSnapshot";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceDataSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceDataSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_data_snapshots_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
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
  typia.assert(superAdmin);
  // Test 1: Search with non-existent entity type
  const nonExistentEntityTypeResponse =
    await api.functional.ecommerce.superAdministrator.data_snapshots.index(
      superAdminConnection,
      {
        body: {
          entity_type: "non_existent_entity_type",
          page: 1,
          limit: 20,
        } satisfies IEcommerceDataSnapshot.IRequest,
      },
    );
  typia.assert(nonExistentEntityTypeResponse);
  TestValidator.equals(
    "data array should be empty for non-existent entity type",
    nonExistentEntityTypeResponse.data,
    [],
  );
  TestValidator.predicate(
    "pagination should be valid for non-existent entity type",
    nonExistentEntityTypeResponse.pagination.records === 0,
  );
  TestValidator.predicate(
    "pages should be 0 for non-existent entity type",
    nonExistentEntityTypeResponse.pagination.pages === 0,
  );
  // Test 2: Search with non-existent entity IDs
  const nonExistentEntityIds = ArrayUtil.repeat(
    3,
    () =>
      typia.random<string & tags.Format<"uuid">>() satisfies string as string,
  );
  const nonExistentIdsResponse =
    await api.functional.ecommerce.superAdministrator.data_snapshots.index(
      superAdminConnection,
      {
        body: {
          entity_ids: nonExistentEntityIds,
          page: 1,
          limit: 10,
        } satisfies IEcommerceDataSnapshot.IRequest,
      },
    );
  typia.assert(nonExistentIdsResponse);
  TestValidator.equals(
    "data array should be empty for non-existent entity IDs",
    nonExistentIdsResponse.data,
    [],
  );
  TestValidator.predicate(
    "records should be 0 for non-existent entity IDs",
    nonExistentIdsResponse.pagination.records === 0,
  );
  // Test 3: Search with future date range
  const futureDate = new Date(Date.now() + 86400000).toISOString(); // Tomorrow
  const futureDateResponse =
    await api.functional.ecommerce.superAdministrator.data_snapshots.index(
      superAdminConnection,
      {
        body: {
          created_at_after: futureDate satisfies string,
          page: 1,
          limit: 5,
        } satisfies IEcommerceDataSnapshot.IRequest,
      },
    );
  typia.assert(futureDateResponse);
  TestValidator.equals(
    "data array should be empty for future date range",
    futureDateResponse.data,
    [],
  );
  TestValidator.predicate(
    "records should be 0 for future date range",
    futureDateResponse.pagination.records === 0,
  );
  // Test 4: Search with specific creator filter that doesn't exist
  const nonExistentCreatorId = typia.random<string & tags.Format<"uuid">>();
  const nonExistentCreatorResponse =
    await api.functional.ecommerce.superAdministrator.data_snapshots.index(
      superAdminConnection,
      {
        body: {
          creator_customer_id: nonExistentCreatorId,
          page: 2,
          limit: 15,
        } satisfies IEcommerceDataSnapshot.IRequest,
      },
    );
  typia.assert(nonExistentCreatorResponse);
  TestValidator.equals(
    "data array should be empty for non-existent creator",
    nonExistentCreatorResponse.data,
    [],
  );
  TestValidator.predicate(
    "records should be 0 for non-existent creator",
    nonExistentCreatorResponse.pagination.records === 0,
  );
  // Test 5: Search with non-matching change description
  const uniqueSearchTerm = RandomGenerator.alphaNumeric(20);
  const uniqueSearchResponse =
    await api.functional.ecommerce.superAdministrator.data_snapshots.index(
      superAdminConnection,
      {
        body: {
          change_description_search: uniqueSearchTerm,
          page: 1,
          limit: 25,
        } satisfies IEcommerceDataSnapshot.IRequest,
      },
    );
  typia.assert(uniqueSearchResponse);
  TestValidator.equals(
    "data array should be empty for unique search term",
    uniqueSearchResponse.data,
    [],
  );
  TestValidator.predicate(
    "records should be 0 for unique search term",
    uniqueSearchResponse.pagination.records === 0,
  );
  // Test 6: Verify pagination metadata structure for all empty results
  const emptyResponses = [
    nonExistentEntityTypeResponse,
    nonExistentIdsResponse,
    futureDateResponse,
    nonExistentCreatorResponse,
    uniqueSearchResponse,
  ];
  for (const response of emptyResponses) {
    TestValidator.predicate(
      "current page should be valid",
      response.pagination.current >= 1,
    );
    TestValidator.predicate(
      "limit should be valid",
      response.pagination.limit >= 1,
    );
    TestValidator.predicate(
      "records should be 0",
      response.pagination.records === 0,
    );
    TestValidator.predicate(
      "pages should be 0",
      response.pagination.pages === 0,
    );
  }
}
