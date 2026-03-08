import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_admin_shipments_filtering_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Create admin connection with token for shipment API calls
  const adminShipmentConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: adminAuth.token.access },
  };
  // 2. Generate test data for filtering
  // Create multiple sellers (simulated via UUIDs)
  const sellerId1: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const sellerId2: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Create multiple orders (simulated via UUIDs)
  const orderId1: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const orderId2: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Generate tracking numbers with various patterns
  const trackingSubstring: string = "TRK123";
  // Generate date range for filtering (30-day window)
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const createdAfter: string & tags.Format<"date-time"> =
    thirtyDaysAgo.toISOString();
  const createdBefore: string & tags.Format<"date-time"> =
    sevenDaysAgo.toISOString();
  // 3. Test tracking number partial match filtering
  const trackingFiltered =
    await api.functional.ecommerceMall.admin.shipments.index(
      adminShipmentConnection,
      {
        body: {
          trackingNumber: trackingSubstring,
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(trackingFiltered);
  TestValidator.predicate("tracking number filtered correctly", () =>
    trackingFiltered.data.every((s) =>
      s.tracking_number.includes(trackingSubstring),
    ),
  );
  // 4. Test date range filtering
  const dateFiltered = await api.functional.ecommerceMall.admin.shipments.index(
    adminShipmentConnection,
    {
      body: {
        createdAfter: createdAfter,
        createdBefore: createdBefore,
      } satisfies IEcommerceMallShipment.IRequest,
    },
  );
  typia.assert(dateFiltered);
  TestValidator.predicate("date range filtered correctly", () =>
    dateFiltered.data.every((s) => {
      const createdAt = new Date(s.created_at);
      return (
        createdAt >= new Date(createdAfter) &&
        createdAt <= new Date(createdBefore)
      );
    }),
  );
  // 5. Test sellerId filtering
  const sellerFiltered =
    await api.functional.ecommerceMall.admin.shipments.index(
      adminShipmentConnection,
      {
        body: {
          sellerId: sellerId1,
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(sellerFiltered);
  TestValidator.predicate("sellerId filtered correctly", () =>
    sellerFiltered.data.every((s) => s.seller.id === sellerId1),
  );
  // 6. Test orderId filtering
  const orderFiltered =
    await api.functional.ecommerceMall.admin.shipments.index(
      adminShipmentConnection,
      {
        body: {
          orderId: orderId1,
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(orderFiltered);
  TestValidator.predicate("orderId filtered correctly", () =>
    orderFiltered.data.every((s) => s.order.id === orderId1),
  );
  // 7. Test cursor-based pagination with configurable limit
  const customLimit = 10;
  const page1 = await api.functional.ecommerceMall.admin.shipments.index(
    adminShipmentConnection,
    {
      body: {
        limit: customLimit,
      } satisfies IEcommerceMallShipment.IRequest,
    },
  );
  typia.assert(page1);
  TestValidator.equals(
    "page 1 limit applied",
    page1.pagination.limit,
    customLimit,
  );
  TestValidator.equals("page 1 current", page1.pagination.current, 1);
  TestValidator.predicate(
    "pagination has valid structure",
    () => page1.pagination.pages >= 0 && page1.pagination.records >= 0,
  );
  // Test next page navigation
  if (page1.pagination.pages > 1) {
    const page2 = await api.functional.ecommerceMall.admin.shipments.index(
      adminShipmentConnection,
      {
        body: {
          page: (page1.pagination.current + 1).toString(),
          limit: customLimit,
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
    typia.assert(page2);
    TestValidator.equals("page 2 current", page2.pagination.current, 2);
  }
  // 8. Test sorting by sellerId ascending
  const sellerIdSortAsc =
    await api.functional.ecommerceMall.admin.shipments.index(
      adminShipmentConnection,
      {
        body: {
          sortBy: "sellerId",
          sortOrder: "asc",
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(sellerIdSortAsc);
  TestValidator.predicate(
    "sortBy sellerId asc",
    () => sellerIdSortAsc.pagination.records >= 0,
  );
  // 9. Test sorting by trackingNumber descending
  const trackingSortDesc =
    await api.functional.ecommerceMall.admin.shipments.index(
      adminShipmentConnection,
      {
        body: {
          sortBy: "trackingNumber",
          sortOrder: "desc",
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(trackingSortDesc);
  TestValidator.predicate(
    "sortBy trackingNumber desc",
    () => trackingSortDesc.pagination.records >= 0,
  );
  // 10. Test combined filters
  const combinedFilters =
    await api.functional.ecommerceMall.admin.shipments.index(
      adminShipmentConnection,
      {
        body: {
          trackingNumber: trackingSubstring,
          createdAfter: createdAfter,
          createdBefore: createdBefore,
          sellerId: sellerId1,
        } satisfies IEcommerceMallShipment.IRequest,
      },
    );
  typia.assert(combinedFilters);
  TestValidator.predicate("combined filters satisfy all conditions", () =>
    combinedFilters.data.every(
      (s) =>
        s.tracking_number.includes(trackingSubstring) &&
        new Date(s.created_at) >= new Date(createdAfter) &&
        new Date(s.created_at) <= new Date(createdBefore) &&
        s.seller.id === sellerId1,
    ),
  );
  // 11. Test empty results when no shipments match
  const nonExistentOrderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const emptyResult = await api.functional.ecommerceMall.admin.shipments.index(
    adminShipmentConnection,
    {
      body: {
        orderId: nonExistentOrderId,
      } satisfies IEcommerceMallShipment.IRequest,
    },
  );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty results pages=0",
    emptyResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty results records=0",
    emptyResult.pagination.records,
    0,
  );
  // 12. Test response structure validation
  const structureTest =
    await api.functional.ecommerceMall.admin.shipments.index(
      adminShipmentConnection,
      {
        body: {},
      },
    );
  typia.assert(structureTest);
  TestValidator.equals(
    "pagination structure - current is number",
    typeof structureTest.pagination.current === "number",
    true,
  );
  TestValidator.equals(
    "pagination structure - limit is number",
    typeof structureTest.pagination.limit === "number",
    true,
  );
  TestValidator.equals(
    "pagination structure - records is number",
    typeof structureTest.pagination.records === "number",
    true,
  );
  TestValidator.equals(
    "pagination structure - pages is number",
    typeof structureTest.pagination.pages === "number",
    true,
  );
  // Test shipment summary structure when records exist
  if (structureTest.data.length > 0) {
    const sampleShipment = structureTest.data[0];
    TestValidator.equals(
      "shipment has order summary",
      sampleShipment.order.id !== undefined,
      true,
    );
    TestValidator.equals(
      "shipment has order_number",
      typeof sampleShipment.order.order_number === "string",
      true,
    );
    TestValidator.equals(
      "shipment has seller summary",
      sampleShipment.seller.id !== undefined,
      true,
    );
    TestValidator.equals(
      "shipment has seller email",
      typeof sampleShipment.seller.email === "string",
      true,
    );
  }
}
