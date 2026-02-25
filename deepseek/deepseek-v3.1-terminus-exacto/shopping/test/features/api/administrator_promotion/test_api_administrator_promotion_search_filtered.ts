import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceAdministratorPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorPromotion";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceAdministratorPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceAdministratorPromotion";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test filtering capabilities for promotion requests search.
 */
export async function test_api_administrator_promotion_search_filtered(
  connection: api.IConnection,
): Promise<void> {
  // Note: This test assumes there are existing promotion requests in the test database
  // with various statuses and request_reason values for the filters to work with.
  // Test status filtering
  const pendingResponse = await api.functional.ecommerce.administrators.index(
    connection,
    {
      body: {
        status: "pending",
      } satisfies IEcommerceAdministratorPromotion.IRequest,
    },
  );
  typia.assert(pendingResponse);
  TestValidator.predicate(
    "returns only pending requests",
    pendingResponse.data.every((item) => item.status === "pending"),
  );
  const approvedResponse = await api.functional.ecommerce.administrators.index(
    connection,
    {
      body: {
        status: "approved",
      } satisfies IEcommerceAdministratorPromotion.IRequest,
    },
  );
  typia.assert(approvedResponse);
  TestValidator.predicate(
    "returns only approved requests",
    approvedResponse.data.every((item) => item.status === "approved"),
  );
  const rejectedResponse = await api.functional.ecommerce.administrators.index(
    connection,
    {
      body: {
        status: "rejected",
      } satisfies IEcommerceAdministratorPromotion.IRequest,
    },
  );
  typia.assert(rejectedResponse);
  TestValidator.predicate(
    "returns only rejected requests",
    rejectedResponse.data.every((item) => item.status === "rejected"),
  );
  // Test date range filtering
  const now = new Date().toISOString();
  const threeDaysAgo = new Date(
    Date.now() - 3 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const oneWeekAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const dateFiltered = await api.functional.ecommerce.administrators.index(
    connection,
    {
      body: {
        created_at_from: threeDaysAgo,
        created_at_to: now,
      } satisfies IEcommerceAdministratorPromotion.IRequest,
    },
  );
  typia.assert(dateFiltered);
  TestValidator.predicate(
    "date filtered results should be within range",
    dateFiltered.data.every(
      (req) =>
        new Date(req.created_at) >= new Date(threeDaysAgo) &&
        new Date(req.created_at) <= new Date(now),
    ),
  );
  // Test text search functionality
  const keywordSearch = await api.functional.ecommerce.administrators.index(
    connection,
    {
      body: {
        request_reason: "admin",
      } satisfies IEcommerceAdministratorPromotion.IRequest,
    },
  );
  typia.assert(keywordSearch);
  TestValidator.predicate(
    "keyword search should find matching records",
    keywordSearch.data.length > 0,
  );
  // Test combined filters (status + date range + keyword + pagination)
  const combinedSearch = await api.functional.ecommerce.administrators.index(
    connection,
    {
      body: {
        status: "pending",
        request_reason: "system",
        created_at_from: oneWeekAgo,
        created_at_to: now,
        page: 1,
        limit: 10,
      } satisfies IEcommerceAdministratorPromotion.IRequest,
    },
  );
  typia.assert(combinedSearch);
  TestValidator.predicate(
    "combined filter should validate pagination limit",
    combinedSearch.pagination.limit === 10,
  );
  TestValidator.predicate(
    "combined filter should return page 1",
    combinedSearch.pagination.current === 1,
  );
}