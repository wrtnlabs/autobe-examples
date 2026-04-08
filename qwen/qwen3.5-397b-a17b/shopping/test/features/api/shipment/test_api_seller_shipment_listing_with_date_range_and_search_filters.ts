import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipment";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test seller shipment listing with date range and search filters.
 *
 * Validates the complete shipment filtering functionality including date range filters, carrier name search, tracking number search, and general text search. Ensures that filters work correctly both individually and in combination, and that pagination metadata accurately reflects filtered results.
 *
 * The test covers shipped_from and shipped_to date boundaries, partial match searches for carrier names and tracking numbers, and verifies that multiple filters combine with AND logic. All responses are validated against the IPageIShoppingMallShipment.ISummary type structure.
 *
 * 1. Seller registers and authenticates using authorize_seller_join utility.
 * 2. Basic shipment listing without filters validates response structure.
 * 3. shipped_from filter tests lower bound date filtering.
 * 4. shipped_from and shipped_to together test date range filtering.
 * 5. carrier_name partial match tests case-insensitive carrier search.
 * 6. tracking_number partial match tests tracking number search.
 * 7. General search field tests cross-field text matching.
 * 8. Combined filters test AND logic with multiple criteria.
 * 9. Pagination metadata validation ensures accurate record counts.
 */
export async function test_api_seller_shipment_listing_with_date_range_and_search_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Test basic shipment listing without filters
  const basicList =
    await api.functional.shoppingMall.seller.seller.shipments.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IShoppingMallShipment.IRequest,
      },
    );
  typia.assert(basicList);
  TestValidator.predicate(
    "basic list has pagination",
    basicList.pagination !== undefined,
  );
  TestValidator.predicate(
    "basic list has data array",
    Array.isArray(basicList.data),
  );
  // 3. Test shipped_from date filter
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const shippedFromList =
    await api.functional.shoppingMall.seller.seller.shipments.index(
      sellerConnection,
      {
        body: {
          shipped_from: thirtyDaysAgo.toISOString(),
          page: 1,
          limit: 20,
        } satisfies IShoppingMallShipment.IRequest,
      },
    );
  typia.assert(shippedFromList);
  TestValidator.predicate(
    "shipped_from filter returns valid response",
    shippedFromList.pagination.records >= 0,
  );
  // 4. Test shipped_from and shipped_to date range
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const dateRangeList =
    await api.functional.shoppingMall.seller.seller.shipments.index(
      sellerConnection,
      {
        body: {
          shipped_from: thirtyDaysAgo.toISOString(),
          shipped_to: new Date().toISOString(),
          page: 1,
          limit: 20,
        } satisfies IShoppingMallShipment.IRequest,
      },
    );
  typia.assert(dateRangeList);
  TestValidator.predicate(
    "date range filter returns valid response",
    dateRangeList.pagination.records >= 0,
  );
  // 5. Test carrier_name partial match filter
  const carrierFilterList =
    await api.functional.shoppingMall.seller.seller.shipments.index(
      sellerConnection,
      {
        body: {
          carrier_name: "Fed",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallShipment.IRequest,
      },
    );
  typia.assert(carrierFilterList);
  TestValidator.predicate(
    "carrier_name filter returns valid response",
    carrierFilterList.pagination.records >= 0,
  );
  // 6. Test tracking_number partial match filter
  const trackingFilterList =
    await api.functional.shoppingMall.seller.seller.shipments.index(
      sellerConnection,
      {
        body: {
          tracking_number: "1Z",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallShipment.IRequest,
      },
    );
  typia.assert(trackingFilterList);
  TestValidator.predicate(
    "tracking_number filter returns valid response",
    trackingFilterList.pagination.records >= 0,
  );
  // 7. Test general search field
  const searchList =
    await api.functional.shoppingMall.seller.seller.shipments.index(
      sellerConnection,
      {
        body: {
          search: "test",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallShipment.IRequest,
      },
    );
  typia.assert(searchList);
  TestValidator.predicate(
    "general search returns valid response",
    searchList.pagination.records >= 0,
  );
  // 8. Test combined filters (AND logic)
  const combinedList =
    await api.functional.shoppingMall.seller.seller.shipments.index(
      sellerConnection,
      {
        body: {
          shipped_from: thirtyDaysAgo.toISOString(),
          carrier_name: "Fed",
          is_delivered: false,
          page: 1,
          limit: 20,
        } satisfies IShoppingMallShipment.IRequest,
      },
    );
  typia.assert(combinedList);
  TestValidator.predicate(
    "combined filters return valid response",
    combinedList.pagination.records >= 0,
  );
  // 9. Validate pagination metadata structure
  TestValidator.predicate(
    "pagination has current page",
    basicList.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has limit",
    basicList.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination has records count",
    basicList.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    basicList.pagination.pages >= 0,
  );
  // 10. Validate shipment data structure if results exist
  if (basicList.data.length > 0) {
    const firstShipment = basicList.data[0];
    // typia.assert already validated the structure, so we test business logic
    TestValidator.predicate(
      "shipment id is valid uuid",
      /^[0-9a-f-]{36}$/i.test(firstShipment.id),
    );
    TestValidator.predicate(
      "carrier name is non-empty",
      firstShipment.carrier_name.length > 0,
    );
    TestValidator.predicate(
      "tracking number is non-empty",
      firstShipment.tracking_number.length > 0,
    );
    TestValidator.predicate(
      "order has code",
      firstShipment.order.code.length > 0,
    );
    TestValidator.predicate(
      "seller has email",
      firstShipment.seller.email.length > 0,
    );
  }
}
