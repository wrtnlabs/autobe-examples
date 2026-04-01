import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipment";
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

export async function test_api_seller_shipment_filter_by_tracking(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Test filter by exact tracking carrier name
  const carrierFilterResult =
    await api.functional.shoppingMall.seller.shipments.index(sellerConnection, {
      body: {
        tracking_carrier: "FedEx",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallShipment.IRequest,
    });
  typia.assert(carrierFilterResult);
  TestValidator.predicate("carrier filter returns valid pagination", () => {
    return (
      carrierFilterResult.pagination.current >= 1 &&
      carrierFilterResult.pagination.limit > 0 &&
      carrierFilterResult.pagination.records >= 0 &&
      carrierFilterResult.pagination.pages >= 0
    );
  });
  TestValidator.predicate("carrier filter data is array", () => {
    return Array.isArray(carrierFilterResult.data);
  });
  // 3. Test filter by partial tracking number match
  const trackingNumberFilterResult =
    await api.functional.shoppingMall.seller.shipments.index(sellerConnection, {
      body: {
        tracking_number: "12345",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallShipment.IRequest,
    });
  typia.assert(trackingNumberFilterResult);
  TestValidator.predicate(
    "tracking number filter returns valid pagination",
    () => {
      return (
        trackingNumberFilterResult.pagination.current >= 1 &&
        trackingNumberFilterResult.pagination.limit > 0
      );
    },
  );
  // 4. Test general search parameter (OR logic across carrier and tracking number)
  const searchResult = await api.functional.shoppingMall.seller.shipments.index(
    sellerConnection,
    {
      body: {
        search: "DHL",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallShipment.IRequest,
    },
  );
  typia.assert(searchResult);
  TestValidator.predicate("search filter returns valid structure", () => {
    return (
      searchResult.pagination.records >= 0 && Array.isArray(searchResult.data)
    );
  });
  // 5. Test combined filters (AND logic - carrier + tracking number)
  const combinedFilterResult =
    await api.functional.shoppingMall.seller.shipments.index(sellerConnection, {
      body: {
        tracking_carrier: "UPS",
        tracking_number: "ABC",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallShipment.IRequest,
    });
  typia.assert(combinedFilterResult);
  TestValidator.predicate("combined filters return valid pagination", () => {
    return (
      combinedFilterResult.pagination.current >= 1 &&
      combinedFilterResult.pagination.pages >= 0
    );
  });
  // 6. Test pagination parameters with filters
  const paginationResult =
    await api.functional.shoppingMall.seller.shipments.index(sellerConnection, {
      body: {
        tracking_carrier: "FedEx",
        page: 2,
        limit: 5,
      } satisfies IShoppingMallShipment.IRequest,
    });
  typia.assert(paginationResult);
  TestValidator.predicate("pagination returns valid current page", () => {
    return paginationResult.pagination.current >= 1;
  });
  TestValidator.equals(
    "limit matches request",
    paginationResult.pagination.limit,
    5,
  );
  // 7. Test date range filter
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const dateRangeResult =
    await api.functional.shoppingMall.seller.shipments.index(sellerConnection, {
      body: {
        shipped_at_from: yesterday.toISOString(),
        shipped_at_to: now.toISOString(),
        page: 1,
        limit: 10,
      } satisfies IShoppingMallShipment.IRequest,
    });
  typia.assert(dateRangeResult);
  TestValidator.predicate("date range filter returns valid structure", () => {
    return (
      dateRangeResult.pagination.records >= 0 &&
      Array.isArray(dateRangeResult.data)
    );
  });
  // 8. Test confirmed status filter
  const confirmedFilterResult =
    await api.functional.shoppingMall.seller.shipments.index(sellerConnection, {
      body: {
        confirmed: true,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallShipment.IRequest,
    });
  typia.assert(confirmedFilterResult);
  TestValidator.predicate("confirmed filter returns valid structure", () => {
    return Array.isArray(confirmedFilterResult.data);
  });
  // 9. Test unconfirmed status filter
  const unconfirmedFilterResult =
    await api.functional.shoppingMall.seller.shipments.index(sellerConnection, {
      body: {
        confirmed: false,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallShipment.IRequest,
    });
  typia.assert(unconfirmedFilterResult);
  TestValidator.predicate("unconfirmed filter returns valid structure", () => {
    return Array.isArray(unconfirmedFilterResult.data);
  });
}
