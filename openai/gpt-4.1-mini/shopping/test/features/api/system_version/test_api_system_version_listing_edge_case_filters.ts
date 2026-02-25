import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSystemVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSystemVersion";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallSystemVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemVersion";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_system_version_listing_edge_case_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registers and authenticates
  const adminConnection: api.IConnection = { host: connection.host };
  const joinOutput = await authorize_administrator_join(adminConnection, {
    body: {
      email: RandomGenerator.alphaNumeric(8) + "@test.com",
      password: "adminPassword123",
    },
  });
  typia.assert(joinOutput);
  adminConnection.headers = {
    Authorization: joinOutput.token.access,
  };
  // For scenario testing, we'll attempt the systemVersions.index with various filters
  // 2. Setup dates for testing
  // Use ISO strings for boundary conditions
  const baseDate = new Date();
  const dayInMs = 24 * 60 * 60 * 1000;
  // Assume our known entity name for filtering test
  // Use some plausible entityName that might occur in the system
  const ENTITY_NAME = "shopping_mall_sellers";
  // 3. Test with date range filter that includes some recent dates
  const createdAtStart = new Date(
    baseDate.getTime() - 10 * dayInMs,
  ).toISOString(); // 10 days ago
  const createdAtEnd = new Date(baseDate.getTime() + dayInMs).toISOString(); // 1 day after now
  // 4. Query with filters to retrieve existing systemVersions
  const requestBody: IShoppingMallSystemVersion.IRequest = {
    createdAtStart: createdAtStart,
    createdAtEnd: createdAtEnd,
    entityName: ENTITY_NAME,
    page: 1,
    pageSize: 50,
    sortField: "createdAt",
    sortOrder: "desc",
  };
  const result =
    await api.functional.shoppingMall.administrator.systemVersions.index(
      adminConnection,
      {
        body: requestBody,
      },
    );
  typia.assert(result);
  // 5. Validate that all returned records match the filter criteria
  const nowISO = new Date().toISOString();
  // Validate pagination fields
  TestValidator.predicate(
    "pagination current page >= 1",
    result.pagination.current >= 1,
  );
  TestValidator.predicate("pagination limit > 0", result.pagination.limit > 0);
  TestValidator.predicate(
    "pagination pages >= 0",
    result.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    result.pagination.records >= 0,
  );
  // Check each record for filter compliance
  for (const version of result.data) {
    // createdAt should be within range
    TestValidator.predicate(
      `record createdAt ${version.createdAt} should be >= createdAtStart`,
      version.createdAt >= createdAtStart,
    );
    TestValidator.predicate(
      `record createdAt ${version.createdAt} should be <= createdAtEnd`,
      version.createdAt <= createdAtEnd,
    );
    // entityName should match filter
    TestValidator.equals(
      "record entityName matches filter",
      version.entityName,
      ENTITY_NAME,
    );
  }
  // 6. Test edge case: filters that return no records
  const noMatchRequest: IShoppingMallSystemVersion.IRequest = {
    createdAtStart: new Date(2000, 0, 1).toISOString(),
    createdAtEnd: new Date(2000, 0, 2).toISOString(),
    entityName: "non_existent_entity_name_filter",
    page: 1,
    pageSize: 10,
  };
  const noMatchResult =
    await api.functional.shoppingMall.administrator.systemVersions.index(
      adminConnection,
      { body: noMatchRequest },
    );
  typia.assert(noMatchResult);
  TestValidator.equals(
    "no match data array is empty",
    noMatchResult.data.length,
    0,
  );
  TestValidator.predicate(
    "pagination total records is zero",
    noMatchResult.pagination.records === 0,
  );
  // 7. Boundary test: createdAtStart and createdAtEnd as the same timestamp
  const boundaryTimestamp = new Date().toISOString();
  const boundaryRequest: IShoppingMallSystemVersion.IRequest = {
    createdAtStart: boundaryTimestamp,
    createdAtEnd: boundaryTimestamp,
    page: 1,
    pageSize: 20,
  };
  const boundaryResult =
    await api.functional.shoppingMall.administrator.systemVersions.index(
      adminConnection,
      { body: boundaryRequest },
    );
  typia.assert(boundaryResult);
  if (boundaryResult.data.length > 0) {
    for (const version of boundaryResult.data) {
      TestValidator.predicate(
        "boundary record createdAt >= createdAtStart",
        version.createdAt >= boundaryTimestamp,
      );
      TestValidator.predicate(
        "boundary record createdAt <= createdAtEnd",
        version.createdAt <= boundaryTimestamp,
      );
    }
  } else {
    TestValidator.predicate(
      "boundary no data result pagination records is zero",
      boundaryResult.pagination.records === 0,
    );
  }
}
