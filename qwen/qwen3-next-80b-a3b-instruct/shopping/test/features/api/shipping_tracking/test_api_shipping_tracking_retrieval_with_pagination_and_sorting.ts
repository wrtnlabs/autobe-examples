import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShippingTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShippingTracking";
import type { IShoppingMallShippingTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingTracking";
export async function test_api_shipping_tracking_retrieval_with_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Fetch initial 20 tracking records
  const response = await api.functional.shoppingMall.shipping_trackings._patch(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies IShoppingMallShippingTracking.IRequest,
    },
  );
  typia.assert(response);
  // Validate pagination
  TestValidator.equals(
    "default page should be 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "default limit should be 20",
    response.pagination.limit,
    20,
  );
  TestValidator.equals(
    "total records should be at least 20",
    response.pagination.records,
    20,
  );
  TestValidator.equals("total pages should be 1", response.pagination.pages, 1);
  TestValidator.equals(
    "data should contain 20 records",
    response.data.length,
    20,
  );
  // Test pagination with custom page and limit
  const page2Response =
    await api.functional.shoppingMall.shipping_trackings._patch(
      adminConnection,
      {
        body: {
          page: 2,
          limit: 5,
        } satisfies IShoppingMallShippingTracking.IRequest,
      },
    );
  typia.assert(page2Response);
  TestValidator.equals(
    "page 2 should have page number 2",
    page2Response.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 should have limit 5",
    page2Response.pagination.limit,
    5,
  );
  TestValidator.equals(
    "page 2 should have 5 records",
    page2Response.data.length,
    5,
  );
  TestValidator.equals(
    "total pages should be at least 4",
    page2Response.pagination.pages,
    4,
  );
  // Test sorting by trackingNumber ascending
  const trackingNumberAscResponse =
    await api.functional.shoppingMall.shipping_trackings._patch(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 20,
          sort: "trackingNumber",
          order: "asc",
        } satisfies IShoppingMallShippingTracking.IRequest,
      },
    );
  typia.assert(trackingNumberAscResponse);
  TestValidator.index(
    "trackingNumber ascending order",
    response.data.sort((a, b) =>
      a.tracking_number.localeCompare(b.tracking_number),
    ),
    trackingNumberAscResponse.data,
  );
  // Test sorting by trackingNumber descending
  const trackingNumberDescResponse =
    await api.functional.shoppingMall.shipping_trackings._patch(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 20,
          sort: "trackingNumber",
          order: "desc",
        } satisfies IShoppingMallShippingTracking.IRequest,
      },
    );
  typia.assert(trackingNumberDescResponse);
  TestValidator.index(
    "trackingNumber descending order",
    response.data.sort((a, b) =>
      b.tracking_number.localeCompare(a.tracking_number),
    ),
    trackingNumberDescResponse.data,
  );
  // Test sorting by carrier ascending
  const carrierAscResponse =
    await api.functional.shoppingMall.shipping_trackings._patch(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 20,
          sort: "carrier",
          order: "asc",
        } satisfies IShoppingMallShippingTracking.IRequest,
      },
    );
  typia.assert(carrierAscResponse);
  TestValidator.index(
    "carrier ascending order",
    response.data.sort((a, b) => a.carrier.localeCompare(b.carrier)),
    carrierAscResponse.data,
  );
  // Test sorting by carrier descending
  const carrierDescResponse =
    await api.functional.shoppingMall.shipping_trackings._patch(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 20,
          sort: "carrier",
          order: "desc",
        } satisfies IShoppingMallShippingTracking.IRequest,
      },
    );
  typia.assert(carrierDescResponse);
  TestValidator.index(
    "carrier descending order",
    response.data.sort((a, b) => b.carrier.localeCompare(a.carrier)),
    carrierDescResponse.data,
  );
  // Test sorting by estimatedDeliveryDate ascending
  const estDateAscResponse =
    await api.functional.shoppingMall.shipping_trackings._patch(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 20,
          sort: "estimatedDeliveryDate",
          order: "asc",
        } satisfies IShoppingMallShippingTracking.IRequest,
      },
    );
  typia.assert(estDateAscResponse);
  TestValidator.index(
    "estimatedDeliveryDate ascending order",
    response.data.sort((a, b) => {
      if (!a.estimated_delivery_date && !b.estimated_delivery_date) return 0;
      if (!a.estimated_delivery_date) return 1;
      if (!b.estimated_delivery_date) return -1;
      return (
        new Date(a.estimated_delivery_date!).getTime() -
        new Date(b.estimated_delivery_date!).getTime()
      );
    }),
    estDateAscResponse.data,
  );
  // Test sorting by estimatedDeliveryDate descending
  const estDateDescResponse =
    await api.functional.shoppingMall.shipping_trackings._patch(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 20,
          sort: "estimatedDeliveryDate",
          order: "desc",
        } satisfies IShoppingMallShippingTracking.IRequest,
      },
    );
  typia.assert(estDateDescResponse);
  TestValidator.index(
    "estimatedDeliveryDate descending order",
    response.data.sort((a, b) => {
      if (!a.estimated_delivery_date && !b.estimated_delivery_date) return 0;
      if (!a.estimated_delivery_date) return 1;
      if (!b.estimated_delivery_date) return -1;
      return (
        new Date(b.estimated_delivery_date!).getTime() -
        new Date(a.estimated_delivery_date!).getTime()
      );
    }),
    estDateDescResponse.data,
  );
  // Test sorting by actualDeliveryDate ascending
  const actDateAscResponse =
    await api.functional.shoppingMall.shipping_trackings._patch(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 20,
          sort: "actualDeliveryDate",
          order: "asc",
        } satisfies IShoppingMallShippingTracking.IRequest,
      },
    );
  typia.assert(actDateAscResponse);
  TestValidator.index(
    "actualDeliveryDate ascending order",
    response.data.sort((a, b) => {
      if (!a.actual_delivery_date && !b.actual_delivery_date) return 0;
      if (!a.actual_delivery_date) return 1;
      if (!b.actual_delivery_date) return -1;
      return (
        new Date(a.actual_delivery_date!).getTime() -
        new Date(b.actual_delivery_date!).getTime()
      );
    }),
    actDateAscResponse.data,
  );
  // Test sorting by actualDeliveryDate descending
  const actDateDescResponse =
    await api.functional.shoppingMall.shipping_trackings._patch(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 20,
          sort: "actualDeliveryDate",
          order: "desc",
        } satisfies IShoppingMallShippingTracking.IRequest,
      },
    );
  typia.assert(actDateDescResponse);
  TestValidator.index(
    "actualDeliveryDate descending order",
    response.data.sort((a, b) => {
      if (!a.actual_delivery_date && !b.actual_delivery_date) return 0;
      if (!a.actual_delivery_date) return 1;
      if (!b.actual_delivery_date) return -1;
      return (
        new Date(b.actual_delivery_date!).getTime() -
        new Date(a.actual_delivery_date!).getTime()
      );
    }),
    actDateDescResponse.data,
  );
  // Test sorting by status ascending
  const statusAscResponse =
    await api.functional.shoppingMall.shipping_trackings._patch(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 20,
          sort: "status",
          order: "asc",
        } satisfies IShoppingMallShippingTracking.IRequest,
      },
    );
  typia.assert(statusAscResponse);
  TestValidator.index(
    "status ascending order",
    response.data.sort((a, b) => a.status.localeCompare(b.status)),
    statusAscResponse.data,
  );
  // Test sorting by status descending
  const statusDescResponse =
    await api.functional.shoppingMall.shipping_trackings._patch(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 20,
          sort: "status",
          order: "desc",
        } satisfies IShoppingMallShippingTracking.IRequest,
      },
    );
  typia.assert(statusDescResponse);
  TestValidator.index(
    "status descending order",
    response.data.sort((a, b) => b.status.localeCompare(a.status)),
    statusDescResponse.data,
  );
}
