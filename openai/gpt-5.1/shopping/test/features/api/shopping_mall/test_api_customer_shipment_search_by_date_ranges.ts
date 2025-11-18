import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShipmentSearch } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipmentSearch";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipmentSearch } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentSearch";
import type { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";

export async function test_api_customer_shipment_search_by_date_ranges(
  connection: api.IConnection,
) {
  /**
   * 1. Register a customer so that we have an authenticated customer actor.
   * 2. Perform shipment search calls with different date-range filters on
   *    created_at, shipped_at, and delivered_at using
   *    IShoppingMallShipmentSearch.IRequest.
   * 3. For each response, validate structure with typia.assert and validate that
   *    any returned shipments with non-null timestamps fall within the
   *    requested date ranges.
   * 4. Additionally, when sorting by created_at or shipped_at, validate that the
   *    results are ordered according to the requested sort direction wherever
   *    the relevant timestamp is non-null.
   */

  // 1. Register a new customer and obtain authorized session (token is auto-set).
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // Explicitly set ip to null to satisfy union type while letting server
    // derive IP if it wants.
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customer = await api.functional.auth.customer.join(connection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customer);

  // Helper: generate a coherent date-time range (from <= to) around now.
  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;

  const makeRange = (pastDays: number, futureDays: number) => {
    const fromDate = new Date(now.getTime() - pastDays * dayMs);
    const toDate = new Date(now.getTime() + futureDays * dayMs);
    const fromIso = fromDate.toISOString();
    const toIso = toDate.toISOString();
    return { fromIso, toIso };
  };

  // 2a. created_at filter window only, sort by created_at DESC.
  const createdRange = makeRange(30, 0); // last 30 days up to now
  const createdRequestBody = {
    created_from: createdRange.fromIso,
    created_to: createdRange.toIso,
    shipped_from: null,
    shipped_to: null,
    delivered_from: null,
    delivered_to: null,
    page: 1 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
    sort_key: "created_at",
    sort_direction: "desc",
  } satisfies IShoppingMallShipmentSearch.IRequest;

  const createdPage =
    await api.functional.shoppingMall.customer.search.shipments.index(
      connection,
      {
        body: createdRequestBody,
      },
    );
  typia.assert<IPageIShoppingMallShipmentSearch.ISummary>(createdPage);

  // Validate pagination is non-negative and coherent.
  const createdPagination = createdPage.pagination;
  TestValidator.predicate(
    "created range pagination.current is non-negative",
    () => createdPagination.current >= 0,
  );
  TestValidator.predicate(
    "created range pagination.limit is non-negative",
    () => createdPagination.limit >= 0,
  );
  TestValidator.predicate(
    "created range pagination.pages is non-negative",
    () => createdPagination.pages >= 0,
  );

  // Validate that each shipment with non-null created_at lies within [created_from, created_to].
  for (const shipment of createdPage.data) {
    const createdAt = shipment.created_at;
    TestValidator.predicate(
      "shipment created_at within created_from/to window",
      () =>
        createdAt >= createdRange.fromIso && createdAt <= createdRange.toIso,
    );
  }

  // Validate sort by created_at DESC (non-increasing order).
  for (let i = 1; i < createdPage.data.length; i++) {
    const prev = createdPage.data[i - 1];
    const curr = createdPage.data[i];
    TestValidator.predicate(
      "created_at sorted descending",
      () => prev.created_at >= curr.created_at,
    );
  }

  // 2b. shipped_at filter window only, sort by shipped_at ASC.
  const shippedRange = makeRange(60, 0); // wider window for shipped_at
  const shippedRequestBody = {
    created_from: null,
    created_to: null,
    shipped_from: shippedRange.fromIso,
    shipped_to: shippedRange.toIso,
    delivered_from: null,
    delivered_to: null,
    page: 1 as number & tags.Type<"int32">,
    limit: 50 as number & tags.Type<"int32">,
    sort_key: "shipped_at",
    sort_direction: "asc",
  } satisfies IShoppingMallShipmentSearch.IRequest;

  const shippedPage =
    await api.functional.shoppingMall.customer.search.shipments.index(
      connection,
      {
        body: shippedRequestBody,
      },
    );
  typia.assert<IPageIShoppingMallShipmentSearch.ISummary>(shippedPage);

  const shippedPagination = shippedPage.pagination;
  TestValidator.predicate(
    "shipped range pagination.current is non-negative",
    () => shippedPagination.current >= 0,
  );
  TestValidator.predicate(
    "shipped range pagination.limit is non-negative",
    () => shippedPagination.limit >= 0,
  );
  TestValidator.predicate(
    "shipped range pagination.pages is non-negative",
    () => shippedPagination.pages >= 0,
  );

  // Validate that each shipment with non-null shipped_at lies within [shipped_from, shipped_to].
  const shippedData = shippedPage.data;
  for (const shipment of shippedData) {
    const shippedAt = shipment.shipped_at;
    if (shippedAt !== null && shippedAt !== undefined) {
      TestValidator.predicate(
        "shipment shipped_at within shipped_from/to window when not null",
        () =>
          shippedAt >= shippedRange.fromIso && shippedAt <= shippedRange.toIso,
      );
    }
  }

  // Validate sort by shipped_at ASC for records having non-null shipped_at.
  let lastShippedAt: string | null | undefined = null;
  for (const shipment of shippedData) {
    const shippedAt = shipment.shipped_at;
    if (shippedAt !== null && shippedAt !== undefined) {
      if (lastShippedAt !== null && lastShippedAt !== undefined) {
        const prev = lastShippedAt;
        const curr = shippedAt;
        TestValidator.predicate(
          "shipped_at sorted ascending for non-null shipped_at",
          () => prev <= curr,
        );
      }
      lastShippedAt = shippedAt;
    }
  }

  // 2c. delivered_at filter window only, without sort key override (use default sort).
  const deliveredRange = makeRange(90, 0); // last 90 days
  const deliveredRequestBody = {
    created_from: null,
    created_to: null,
    shipped_from: null,
    shipped_to: null,
    delivered_from: deliveredRange.fromIso,
    delivered_to: deliveredRange.toIso,
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
  } satisfies IShoppingMallShipmentSearch.IRequest;

  const deliveredPage =
    await api.functional.shoppingMall.customer.search.shipments.index(
      connection,
      {
        body: deliveredRequestBody,
      },
    );
  typia.assert<IPageIShoppingMallShipmentSearch.ISummary>(deliveredPage);

  const deliveredPagination = deliveredPage.pagination;
  TestValidator.predicate(
    "delivered range pagination.current is non-negative",
    () => deliveredPagination.current >= 0,
  );
  TestValidator.predicate(
    "delivered range pagination.limit is non-negative",
    () => deliveredPagination.limit >= 0,
  );
  TestValidator.predicate(
    "delivered range pagination.pages is non-negative",
    () => deliveredPagination.pages >= 0,
  );

  for (const shipment of deliveredPage.data) {
    const deliveredAt = shipment.delivered_at;
    if (deliveredAt !== null && deliveredAt !== undefined) {
      TestValidator.predicate(
        "shipment delivered_at within delivered_from/to window when not null",
        () =>
          deliveredAt >= deliveredRange.fromIso &&
          deliveredAt <= deliveredRange.toIso,
      );
    }
  }
}
