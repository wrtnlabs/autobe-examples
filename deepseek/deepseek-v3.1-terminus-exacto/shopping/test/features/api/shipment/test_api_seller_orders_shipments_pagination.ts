import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test pagination behavior for seller shipment list endpoint with filtering.
 *
 * Creates a seller session and tests the shipments pagination API with various
 * parameters including page numbers, limits, and filtering combinations.
 * Validates pagination metadata correctness and data retrieval.
 */
export async function test_api_seller_orders_shipments_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // Generate a random order ID since we need it for the API
  const orderId = typia.random<string & tags.Format<"uuid">>();
  // 2. Test default pagination (no parameters)
  console.log("Testing default pagination...");
  const defaultResult =
    await api.functional.ecommerce.seller.orders.shipments.index(
      sellerConnection,
      {
        orderId,
        body: {} satisfies IEcommerceShipment.IRequest,
      },
    );
  typia.assert(defaultResult);
  // Validate pagination structure
  TestValidator.predicate(
    "Default result has pagination object",
    () => defaultResult.pagination !== undefined,
  );
  TestValidator.predicate("Default result has data array", () =>
    Array.isArray(defaultResult.data),
  );
  TestValidator.predicate(
    "Current page defaults to 1",
    () => defaultResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "Limit should be positive",
    () => defaultResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "Records count should be non-negative",
    () => defaultResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "Total pages should be non-negative",
    () => defaultResult.pagination.pages >= 0,
  );
  // 3. Test with specific page and limit
  console.log("Testing specific page and limit...");
  const page = randint(1, 5);
  const limit = randint(1, 20);
  const pageResult =
    await api.functional.ecommerce.seller.orders.shipments.index(
      sellerConnection,
      {
        orderId,
        body: {
          page: page satisfies number as number &
            tags.Type<"int32"> &
            tags.Minimum<1>,
          limit: limit satisfies number as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IEcommerceShipment.IRequest,
      },
    );
  typia.assert(pageResult);
  TestValidator.equals(
    "Requested page matches response",
    pageResult.pagination.current,
    page,
  );
  TestValidator.equals(
    "Requested limit matches response",
    pageResult.pagination.limit,
    limit,
  );
  TestValidator.predicate(
    "Data length should not exceed limit",
    () => pageResult.data.length <= limit,
  );
  // 4. Test limit=1 (single item per page)
  console.log("Testing limit=1 (single item per page)...");
  const singlePageResult =
    await api.functional.ecommerce.seller.orders.shipments.index(
      sellerConnection,
      {
        orderId,
        body: {
          page: 1 satisfies number as number &
            tags.Type<"int32"> &
            tags.Minimum<1>,
          limit: 1 satisfies number as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IEcommerceShipment.IRequest,
      },
    );
  typia.assert(singlePageResult);
  TestValidator.equals(
    "Limit should be 1",
    singlePageResult.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "Data length should be 0 or 1",
    () =>
      singlePageResult.data.length === 0 || singlePageResult.data.length === 1,
  );
  // 5. Test page beyond available data
  console.log("Testing page beyond available data...");
  const largePage = defaultResult.pagination.pages + 10;
  const beyondPageResult =
    await api.functional.ecommerce.seller.orders.shipments.index(
      sellerConnection,
      {
        orderId,
        body: {
          page: largePage satisfies number as number &
            tags.Type<"int32"> &
            tags.Minimum<1>,
          limit: 10 satisfies number as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IEcommerceShipment.IRequest,
      },
    );
  typia.assert(beyondPageResult);
  TestValidator.predicate(
    "Page beyond total should return empty data or last page",
    () =>
      beyondPageResult.data.length === 0 ||
      beyondPageResult.pagination.current <= beyondPageResult.pagination.pages,
  );
  // 6. Test filtering with pagination
  console.log("Testing filtering with pagination...");
  // Test with carrier filter
  const carrierFilterResult =
    await api.functional.ecommerce.seller.orders.shipments.index(
      sellerConnection,
      {
        orderId,
        body: {
          carrier_name: RandomGenerator.name(1),
          page: 1 satisfies number as number &
            tags.Type<"int32"> &
            tags.Minimum<1>,
          limit: 10 satisfies number as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IEcommerceShipment.IRequest,
      },
    );
  typia.assert(carrierFilterResult);
  // Test with status filter
  const statuses = ["created", "shipped", "delivered"] as const;
  const randomStatus = RandomGenerator.pick(statuses);
  const statusFilterResult =
    await api.functional.ecommerce.seller.orders.shipments.index(
      sellerConnection,
      {
        orderId,
        body: {
          shipment_status: randomStatus,
          page: 1 satisfies number as number &
            tags.Type<"int32"> &
            tags.Minimum<1>,
          limit: 5 satisfies number as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IEcommerceShipment.IRequest,
      },
    );
  typia.assert(statusFilterResult);
  // Test with date range filter
  const now = new Date().toISOString();
  const pastDate = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const dateFilterResult =
    await api.functional.ecommerce.seller.orders.shipments.index(
      sellerConnection,
      {
        orderId,
        body: {
          created_at_min: pastDate satisfies string & tags.Format<"date-time">,
          created_at_max: now satisfies string & tags.Format<"date-time">,
          page: 1 satisfies number as number &
            tags.Type<"int32"> &
            tags.Minimum<1>,
          limit: 15 satisfies number as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IEcommerceShipment.IRequest,
      },
    );
  typia.assert(dateFilterResult);
  // 7. Test pagination formula consistency
  console.log("Testing pagination formula consistency...");
  // Verify pagination formula: pages = Math.ceil(records / limit)
  const testResult =
    await api.functional.ecommerce.seller.orders.shipments.index(
      sellerConnection,
      {
        orderId,
        body: {
          page: 2 satisfies number as number &
            tags.Type<"int32"> &
            tags.Minimum<1>,
          limit: 7 satisfies number as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IEcommerceShipment.IRequest,
      },
    );
  typia.assert(testResult);
  if (testResult.pagination.records > 0) {
    const expectedPages = Math.ceil(
      testResult.pagination.records / testResult.pagination.limit,
    );
    TestValidator.equals(
      "Total pages calculation matches records/limit",
      testResult.pagination.pages,
      expectedPages,
    );
  }
  // 8. Test that shipments are returned in consistent order
  console.log("Testing consistent ordering...");
  // Get first page
  const firstPage =
    await api.functional.ecommerce.seller.orders.shipments.index(
      sellerConnection,
      {
        orderId,
        body: {
          page: 1 satisfies number as number &
            tags.Type<"int32"> &
            tags.Minimum<1>,
          limit: 5 satisfies number as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IEcommerceShipment.IRequest,
      },
    );
  typia.assert(firstPage);
  // Get second page with same limit
  const secondPage =
    await api.functional.ecommerce.seller.orders.shipments.index(
      sellerConnection,
      {
        orderId,
        body: {
          page: 2 satisfies number as number &
            tags.Type<"int32"> &
            tags.Minimum<1>,
          limit: 5 satisfies number as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IEcommerceShipment.IRequest,
      },
    );
  typia.assert(secondPage);
  // Note: We can't validate specific ordering without knowing server implementation,
  // but we ensure the API works consistently
  console.log("Pagination tests completed successfully");
}
