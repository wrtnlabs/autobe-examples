import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallGuest";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";

export async function test_api_shopping_mall_guests_search_and_list(
  connection: api.IConnection,
) {
  // Test basic call with no filters
  const basicResponse: IPageIShoppingMallGuest.ISummary =
    await api.functional.shoppingMall.shoppingMallGuests.index(connection, {
      body: {} satisfies IShoppingMallGuest.IRequest,
    });
  typia.assert(basicResponse);
  TestValidator.predicate(
    "basic response contains pagination",
    () => basicResponse.pagination !== undefined,
  );
  TestValidator.predicate("basic response contains data array", () =>
    Array.isArray(basicResponse.data),
  );

  // Extract current ISO date for filter construction
  const now = new Date().toISOString();
  // Construct a date one month ago
  const oneMonthAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();

  // Test with created_after filter
  const createdAfterResponse =
    await api.functional.shoppingMall.shoppingMallGuests.index(connection, {
      body: {
        created_after: oneMonthAgo,
      } satisfies IShoppingMallGuest.IRequest,
    });
  typia.assert(createdAfterResponse);
  TestValidator.predicate("all guests created_after filter", () =>
    createdAfterResponse.data.every((guest) => guest.created_at >= oneMonthAgo),
  );

  // Test with created_before filter
  const createdBeforeResponse =
    await api.functional.shoppingMall.shoppingMallGuests.index(connection, {
      body: { created_before: now } satisfies IShoppingMallGuest.IRequest,
    });
  typia.assert(createdBeforeResponse);
  TestValidator.predicate("all guests created_before filter", () =>
    createdBeforeResponse.data.every((guest) => guest.created_at <= now),
  );

  // Test with updated_after filter
  const updatedAfterResponse =
    await api.functional.shoppingMall.shoppingMallGuests.index(connection, {
      body: {
        updated_after: oneMonthAgo,
      } satisfies IShoppingMallGuest.IRequest,
    });
  typia.assert(updatedAfterResponse);
  TestValidator.predicate("all guests updated_after filter", () =>
    updatedAfterResponse.data.every((guest) => guest.updated_at >= oneMonthAgo),
  );

  // Test with updated_before filter
  const updatedBeforeResponse =
    await api.functional.shoppingMall.shoppingMallGuests.index(connection, {
      body: { updated_before: now } satisfies IShoppingMallGuest.IRequest,
    });
  typia.assert(updatedBeforeResponse);
  TestValidator.predicate("all guests updated_before filter", () =>
    updatedBeforeResponse.data.every((guest) => guest.updated_at <= now),
  );

  // Test pagination parameters page and limit
  const paginationResponse =
    await api.functional.shoppingMall.shoppingMallGuests.index(connection, {
      body: { page: 1, limit: 10 } satisfies IShoppingMallGuest.IRequest,
    });
  typia.assert(paginationResponse);
  TestValidator.equals(
    "pagination page should be 1",
    paginationResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should be 10",
    paginationResponse.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination data size <= limit",
    paginationResponse.data.length <= 10,
  );

  // Test combination of filters and pagination
  const combinedResponse =
    await api.functional.shoppingMall.shoppingMallGuests.index(connection, {
      body: {
        page: 2,
        limit: 5,
        created_after: oneMonthAgo,
        updated_before: now,
      } satisfies IShoppingMallGuest.IRequest,
    });
  typia.assert(combinedResponse);
  TestValidator.equals(
    "combined pagination page should be 2",
    combinedResponse.pagination.current,
    2,
  );
  TestValidator.equals(
    "combined pagination limit should be 5",
    combinedResponse.pagination.limit,
    5,
  );
  TestValidator.predicate("combined filter created_after", () =>
    combinedResponse.data.every((guest) => guest.created_at >= oneMonthAgo),
  );
  TestValidator.predicate("combined filter updated_before", () =>
    combinedResponse.data.every((guest) => guest.updated_at <= now),
  );
}
