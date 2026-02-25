import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceAdministratorPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorPromotion";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceAdministratorPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceAdministratorPromotion";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_promotion_comprehensive_search(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as administrator using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // Test 1: Empty search criteria (should return all with pagination)
  const emptySearch =
    await api.functional.ecommerce.administrator.administrator_promotions.index(
      adminConnection,
      { body: {} },
    );
  typia.assert(emptySearch);
  TestValidator.predicate(
    "empty search returns valid pagination response",
    emptySearch.pagination.current === 1 &&
      emptySearch.pagination.limit >= 1 &&
      emptySearch.pagination.records >= 0 &&
      emptySearch.pagination.pages >= 0,
  );
  // Test 2: Status filtering with all possible status values
  const statuses = ["pending", "approved", "rejected"] as const;
  for (const status of statuses) {
    const statusFiltered =
      await api.functional.ecommerce.administrator.administrator_promotions.index(
        adminConnection,
        { body: { status } },
      );
    typia.assert(statusFiltered);
    if (statusFiltered.data.length > 0) {
      TestValidator.predicate(
        `status filter ${status} returns correct statuses only`,
        statusFiltered.data.every((req) => req.status === status),
      );
    }
  }
  // Test 3: Text search with empty string (should work like no filter)
  const textSearchEmpty =
    await api.functional.ecommerce.administrator.administrator_promotions.index(
      adminConnection,
      { body: { request_reason: "" } },
    );
  typia.assert(textSearchEmpty);
  TestValidator.predicate(
    "empty text search returns valid response",
    textSearchEmpty.pagination.current === 1,
  );
  // Test 4: Date range filtering with realistic dates
  const oneWeekAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const oneYearAgo = new Date(
    Date.now() - 365 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const recentRequests =
    await api.functional.ecommerce.administrator.administrator_promotions.index(
      adminConnection,
      { body: { created_at_from: oneWeekAgo } },
    );
  typia.assert(recentRequests);
  const oldRequests =
    await api.functional.ecommerce.administrator.administrator_promotions.index(
      adminConnection,
      { body: { created_at_to: oneYearAgo } },
    );
  typia.assert(oldRequests);
  // Test 5: Combined filters
  const combinedSearch =
    await api.functional.ecommerce.administrator.administrator_promotions.index(
      adminConnection,
      {
        body: {
          status: "pending",
          limit: 5,
          page: 1,
        },
      },
    );
  typia.assert(combinedSearch);
  TestValidator.predicate(
    "combined filters return valid pagination",
    combinedSearch.pagination.limit === 5 &&
      combinedSearch.pagination.current === 1,
  );
  // Test 6: Pagination validation
  const paginationTest =
    await api.functional.ecommerce.administrator.administrator_promotions.index(
      adminConnection,
      { body: { limit: 2, page: 1 } },
    );
  typia.assert(paginationTest);
  TestValidator.predicate(
    "pagination respects limit",
    paginationTest.data.length <= 2,
  );
  // Test 7: Edge case - future date (should return empty or limited results)
  const futureDate = new Date(
    Date.now() + 365 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const futureSearch =
    await api.functional.ecommerce.administrator.administrator_promotions.index(
      adminConnection,
      { body: { created_at_from: futureDate } },
    );
  typia.assert(futureSearch);
  TestValidator.predicate(
    "future date search returns valid response",
    futureSearch.pagination.records >= 0,
  );
  // Test 8: Validate response structure for all returned items
  const sampleSearch =
    await api.functional.ecommerce.administrator.administrator_promotions.index(
      adminConnection,
      { body: { limit: 1 } },
    );
  typia.assert(sampleSearch);
  if (sampleSearch.data.length > 0) {
    const sampleItem = sampleSearch.data[0];
    TestValidator.predicate(
      "sample item has required fields",
      typeof sampleItem.id === "string" &&
        typeof sampleItem.request_reason === "string" &&
        typeof sampleItem.status === "string" &&
        typeof sampleItem.created_at === "string" &&
        typeof sampleItem.updated_at === "string" &&
        typeof sampleItem.requesting_user_id === "string",
    );
  }
}
