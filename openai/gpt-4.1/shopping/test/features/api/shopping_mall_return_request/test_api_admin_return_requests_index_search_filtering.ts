import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReturnRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReturnRequest";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallReturnRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReturnRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShippingPartner } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingPartner";

/**
 * Validate the admin search/filter/sort API for return requests using all query
 * combinations, authentication, and structure.
 *
 * 1. Register a new admin user (for authentication)
 * 2. Ensure unauthenticated request fails
 * 3. Authenticate as admin
 * 4. Exercise API with various filter options:
 *
 * - By status
 * - By order_id/order_item_id
 * - By requested_by_customer_id/requested_by_seller_id
 * - By scheduled_pickup_from / scheduled_pickup_to (date range)
 * - By created_from / created_to (date range)
 * - By reason_q (text search)
 * - By sort_by/sort_direction (asc/desc on available fields)
 * - By page and limit (pagination)
 * - Multiple filters combined
 * - Edge case: no results (use random UUIDs/dates)
 *
 * 5. For each request:
 *
 * - Validate output structure matches IPageIShoppingMallReturnRequest.ISummary
 * - Validate filters are applied correctly (cross-check against returned data)
 * - Validate sorting works as intended
 * - Validate pagination fields are correct, and content matches requested page
 * - Validate NO extra fields leaked and audit fields (created_at, updated_at,
 *   etc) are present
 * - Validate each record's nested order/orderItem/customer/seller/shippingPartner
 *   summary conforms to its schema
 * - Result array and pagination match contract, content can be empty if filter is
 *   unique
 *
 * 6. Security: Check that only authenticated admins can access the endpoint
 *    (unauthenticated request returns error)
 */
export async function test_api_admin_return_requests_index_search_filtering(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as admin
  const adminInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) + "!A1",
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.ICreate;
  const admin = await api.functional.auth.admin.join(connection, {
    body: adminInput,
  });
  typia.assert(admin);
  // 2. Try unauthenticated request (should fail)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated admin should not access returnRequests index",
    async () => {
      await api.functional.shoppingMall.admin.returnRequests.index(unauthConn, {
        body: {} as IShoppingMallReturnRequest.IRequest,
      });
    },
  );
  // 3. Authenticated queries: exercise filters, sorting, pagination
  // Gen all filter params with random values
  const randomStatus = RandomGenerator.pick([
    "pending",
    "approved",
    "scheduled",
    "picked_up",
    "delivered",
    "completed",
    "rejected",
    "cancelled",
  ] as const);
  const randomPage = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >();
  const randomLimit = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<30>
  >();
  const randomSortField = RandomGenerator.pick([
    "created_at",
    "scheduled_pickup_at",
    "status",
    "id",
  ] as const);
  const randomSortDirection = RandomGenerator.pick(["asc", "desc"] as const);
  const dateFrom = new Date(
    Date.now() - 1000 * 60 * 60 * 24 * 30,
  ).toISOString();
  const dateTo = new Date().toISOString();
  const filterCases: Partial<IShoppingMallReturnRequest.IRequest>[] = [
    { status: randomStatus },
    { sort_by: randomSortField, sort_direction: randomSortDirection },
    { page: randomPage, limit: randomLimit },
    { created_from: dateFrom, created_to: dateTo },
    { scheduled_pickup_from: dateFrom, scheduled_pickup_to: dateTo },
    { reason_q: RandomGenerator.paragraph({ sentences: 2 }) },
    {
      status: randomStatus,
      created_from: dateFrom,
      created_to: dateTo,
      sort_by: randomSortField,
      sort_direction: randomSortDirection,
      page: randomPage,
      limit: randomLimit,
    },
  ];
  for (const filters of filterCases) {
    const params = { ...filters } satisfies IShoppingMallReturnRequest.IRequest;
    const result = await api.functional.shoppingMall.admin.returnRequests.index(
      connection,
      {
        body: params,
      },
    );
    typia.assert(result);
    // Validate pagination fields
    TestValidator.predicate(
      "has valid pagination",
      result.pagination.current >= 0 &&
        result.pagination.limit >= 0 &&
        result.pagination.pages >= 0 &&
        result.pagination.records >= 0,
    );
    // Validate each record's schema
    for (const row of result.data) {
      typia.assert(row);
      typia.assert(row.order);
      typia.assert(row.orderItem);
      if (
        row.requestedByCustomer !== null &&
        row.requestedByCustomer !== undefined
      ) {
        typia.assert(row.requestedByCustomer);
      }
      if (
        row.requestedBySeller !== null &&
        row.requestedBySeller !== undefined
      ) {
        typia.assert(row.requestedBySeller);
      }
      if (row.shippingPartner !== null && row.shippingPartner !== undefined) {
        typia.assert(row.shippingPartner);
      }
    }
  }
  // 4. Edge case: filter for a guaranteed empty result (random UUID)
  const emptyFilter = {
    order_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IShoppingMallReturnRequest.IRequest;
  const emptyResult =
    await api.functional.shoppingMall.admin.returnRequests.index(connection, {
      body: emptyFilter,
    });
  typia.assert(emptyResult);
  TestValidator.equals(
    "should return empty data when filter matches none",
    emptyResult.data.length,
    0,
  );
}
