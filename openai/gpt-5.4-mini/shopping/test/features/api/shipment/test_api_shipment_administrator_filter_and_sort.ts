import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Validate administrator shipment filtering, pagination, and sort ordering.
 *
 * Confirms that the administrator shipment browsing endpoint returns shipment summaries that respect the requested filters and ordering rules. The test checks status, order number, carrier name, tracking number, shipped-at, delivered-at, free-text search, and page navigation behavior using real response data.
 *
 * It also verifies pagination metadata consistency and ensures that a broad result set can contain shipments from multiple sellers or multiple orders, proving the response is driven by the search criteria rather than a single source.
 *
 * 1. Authenticate as an administrator through the join utility.
 * 2. Query shipments with newest and oldest sort orders and validate ordering.
 * 3. Apply shipment filters for status, order number, carrier name, tracking number, shipped-at, delivered-at, and free-text search.
 * 4. Verify pagination metadata and confirm broad results include multiple sellers or multiple orders when available.
 */
export async function test_api_shipment_administrator_filter_and_sort(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(8)}@test.com` satisfies string,
      password: RandomGenerator.alphaNumeric(12) satisfies string,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const newestPage =
    await api.functional.mallPlatform.administrator.shipments.index(
      administratorConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sort: "newest",
        } satisfies IMallPlatformShipment.IRequest,
      },
    );
  typia.assert(newestPage);
  TestValidator.equals(
    "pagination current page",
    newestPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination requested limit",
    newestPage.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination record count is non-negative",
    newestPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination page count is non-negative",
    newestPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "page size does not exceed requested limit",
    newestPage.data.length <= newestPage.pagination.limit,
  );
  if (newestPage.data.length > 1) {
    TestValidator.predicate(
      "newest sort order is non-increasing by createdAt",
      newestPage.data.every((shipment, index, array) => {
        if (index === 0) return true;
        return (
          new Date(array[index - 1].createdAt).getTime() >=
          new Date(shipment.createdAt).getTime()
        );
      }),
    );
  }
  const statusCandidate = newestPage.data.find(
    (shipment) =>
      shipment.status === "shipped" || shipment.status === "delivered",
  );
  if (statusCandidate !== undefined) {
    const status = statusCandidate.status as
      | "preparing"
      | "shipped"
      | "delivered"
      | "cancelled";
    const filteredByStatus =
      await api.functional.mallPlatform.administrator.shipments.index(
        administratorConnection,
        {
          body: {
            page: 1,
            limit: 20,
            status,
          } satisfies IMallPlatformShipment.IRequest,
        },
      );
    typia.assert(filteredByStatus);
    TestValidator.predicate(
      "status filter returns only matching shipments",
      filteredByStatus.data.every((shipment) => shipment.status === status),
    );
    TestValidator.equals(
      "filtered pagination current page",
      filteredByStatus.pagination.current,
      1,
    );
    TestValidator.predicate(
      "filtered result count does not exceed limit",
      filteredByStatus.data.length <= filteredByStatus.pagination.limit,
    );
  }
  const carrierCandidate = newestPage.data.find(
    (shipment) => shipment.carrierName.length > 0,
  );
  if (carrierCandidate !== undefined) {
    const filteredByCarrier =
      await api.functional.mallPlatform.administrator.shipments.index(
        administratorConnection,
        {
          body: {
            page: 1,
            limit: 20,
            carrierName: carrierCandidate.carrierName,
          } satisfies IMallPlatformShipment.IRequest,
        },
      );
    typia.assert(filteredByCarrier);
    TestValidator.predicate(
      "carrier name filter returns only matching shipments",
      filteredByCarrier.data.every(
        (shipment) => shipment.carrierName === carrierCandidate.carrierName,
      ),
    );
  }
  const trackingCandidate = newestPage.data.find(
    (shipment) => shipment.trackingNumber.length > 0,
  );
  if (trackingCandidate !== undefined) {
    const filteredByTracking =
      await api.functional.mallPlatform.administrator.shipments.index(
        administratorConnection,
        {
          body: {
            page: 1,
            limit: 20,
            trackingNumber: trackingCandidate.trackingNumber,
          } satisfies IMallPlatformShipment.IRequest,
        },
      );
    typia.assert(filteredByTracking);
    TestValidator.predicate(
      "tracking number filter returns only matching shipments",
      filteredByTracking.data.every(
        (shipment) =>
          shipment.trackingNumber === trackingCandidate.trackingNumber,
      ),
    );
  }
  const shippedAtCandidate = newestPage.data.find(
    (shipment) => shipment.shippedAt !== null,
  );
  if (shippedAtCandidate !== undefined) {
    const filteredByShippedAt =
      await api.functional.mallPlatform.administrator.shipments.index(
        administratorConnection,
        {
          body: {
            page: 1,
            limit: 20,
            shippedAt: shippedAtCandidate.shippedAt,
          } satisfies IMallPlatformShipment.IRequest,
        },
      );
    typia.assert(filteredByShippedAt);
    TestValidator.predicate(
      "shippedAt filter returns only matching shipments",
      filteredByShippedAt.data.every(
        (shipment) => shipment.shippedAt === shippedAtCandidate.shippedAt,
      ),
    );
  }
  const deliveredAtCandidate = newestPage.data.find(
    (shipment) => shipment.deliveredAt !== null,
  );
  if (deliveredAtCandidate !== undefined) {
    const filteredByDeliveredAt =
      await api.functional.mallPlatform.administrator.shipments.index(
        administratorConnection,
        {
          body: {
            page: 1,
            limit: 20,
            deliveredAt: deliveredAtCandidate.deliveredAt,
          } satisfies IMallPlatformShipment.IRequest,
        },
      );
    typia.assert(filteredByDeliveredAt);
    TestValidator.predicate(
      "deliveredAt filter returns only matching shipments",
      filteredByDeliveredAt.data.every(
        (shipment) => shipment.deliveredAt === deliveredAtCandidate.deliveredAt,
      ),
    );
  }
  const searchToken =
    newestPage.data[0]?.carrierName ??
    newestPage.data[0]?.trackingNumber ??
    newestPage.data[0]?.order.orderNumber;
  if (searchToken !== undefined) {
    const searched =
      await api.functional.mallPlatform.administrator.shipments.index(
        administratorConnection,
        {
          body: {
            page: 1,
            limit: 20,
            search: searchToken,
          } satisfies IMallPlatformShipment.IRequest,
        },
      );
    typia.assert(searched);
    TestValidator.predicate(
      "free-text search returns only related shipments",
      searched.data.every(
        (shipment) =>
          shipment.carrierName.includes(searchToken) ||
          shipment.trackingNumber.includes(searchToken) ||
          shipment.order.orderNumber.includes(searchToken),
      ),
    );
  }
  const orderCandidate = newestPage.data.find(
    (shipment) => shipment.order.orderNumber.length > 0,
  );
  if (orderCandidate !== undefined) {
    const filteredByOrder =
      await api.functional.mallPlatform.administrator.shipments.index(
        administratorConnection,
        {
          body: {
            page: 1,
            limit: 20,
            orderNumber: orderCandidate.order.orderNumber,
          } satisfies IMallPlatformShipment.IRequest,
        },
      );
    typia.assert(filteredByOrder);
    TestValidator.predicate(
      "order number filter returns only matching shipments",
      filteredByOrder.data.every(
        (shipment) =>
          shipment.order.orderNumber === orderCandidate.order.orderNumber,
      ),
    );
  }
  const sortedByOldest =
    await api.functional.mallPlatform.administrator.shipments.index(
      administratorConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sort: "oldest",
        } satisfies IMallPlatformShipment.IRequest,
      },
    );
  typia.assert(sortedByOldest);
  if (sortedByOldest.data.length > 1) {
    TestValidator.predicate(
      "oldest sort order is non-decreasing by createdAt",
      sortedByOldest.data.every((shipment, index, array) => {
        if (index === 0) return true;
        return (
          new Date(array[index - 1].createdAt).getTime() <=
          new Date(shipment.createdAt).getTime()
        );
      }),
    );
  }
  const broadPage =
    await api.functional.mallPlatform.administrator.shipments.index(
      administratorConnection,
      {
        body: {
          page: 1,
          limit: 50,
          sort: "newest",
        } satisfies IMallPlatformShipment.IRequest,
      },
    );
  typia.assert(broadPage);
  TestValidator.predicate(
    "broad query respects pagination metadata",
    broadPage.data.length <= broadPage.pagination.limit &&
      broadPage.pagination.records >= broadPage.data.length &&
      broadPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "broad query can include multiple sellers or multiple orders",
    (() => {
      const sellerIds = new Set(
        broadPage.data.map((shipment) => shipment.seller.id),
      );
      const orderIds = new Set(
        broadPage.data.map((shipment) => shipment.order.id),
      );
      return sellerIds.size > 1 || orderIds.size > 1;
    })(),
  );
  const pageTwo =
    await api.functional.mallPlatform.administrator.shipments.index(
      administratorConnection,
      {
        body: {
          page: 2,
          limit: 5,
          sort: "newest",
        } satisfies IMallPlatformShipment.IRequest,
      },
    );
  typia.assert(pageTwo);
  TestValidator.equals(
    "pagination current page for page 2",
    pageTwo.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination limit for page 2",
    pageTwo.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "page size does not exceed requested limit",
    pageTwo.data.length <= 5,
  );
}
