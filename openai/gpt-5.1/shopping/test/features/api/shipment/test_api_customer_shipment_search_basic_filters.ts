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

export async function test_api_customer_shipment_search_basic_filters(
  connection: api.IConnection,
) {
  /**
   * Validate that an authenticated customer can search shipments with basic
   * filters and pagination using PATCH
   * /shoppingMall/customer/search/shipments.
   *
   * Steps:
   *
   * 1. Join as a new customer via POST /auth/customer/join.
   *
   *    - This establishes the Authorization header on the shared connection.
   * 2. Perform a baseline shipment search with simple pagination and no filters to
   *    obtain sample shipment summaries (if any).
   * 3. If baseline search returns at least one shipment:
   *
   *    - Re-search using shipment_codes filter containing the chosen shipment_code
   *         and verify all results match that shipment_code.
   *    - Re-search using order_codes filter containing the chosen order.order_code
   *         and verify all results reference that order_code.
   * 4. If baseline search returns no shipments:
   *
   *    - Still validate pagination invariants and that data is empty.
   */

  // 1. Join as a new customer to obtain an authenticated context.
  const joinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const authorizedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(authorizedCustomer);
  typia.assert<IAuthorizationToken>(authorizedCustomer.token);

  // 2. Baseline shipment search with basic pagination only.
  const page = 1 satisfies number;
  const limit = 10 satisfies number;

  const baselineRequest = {
    page,
    limit,
  } satisfies IShoppingMallShipmentSearch.IRequest;

  const baselinePage: IPageIShoppingMallShipmentSearch.ISummary =
    await api.functional.shoppingMall.customer.search.shipments.index(
      connection,
      {
        body: baselineRequest,
      },
    );
  typia.assert<IPageIShoppingMallShipmentSearch.ISummary>(baselinePage);
  typia.assert<IPage.IPagination>(baselinePage.pagination);

  // Assert pagination basics for the baseline call.
  TestValidator.equals(
    "baseline pagination current page should echo requested page",
    baselinePage.pagination.current,
    page,
  );
  TestValidator.equals(
    "baseline pagination limit should echo requested limit",
    baselinePage.pagination.limit,
    limit,
  );
  TestValidator.predicate(
    "baseline records count should be non-negative",
    baselinePage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "baseline pages count should be non-negative",
    baselinePage.pagination.pages >= 0,
  );

  if (baselinePage.data.length === 0) {
    // No shipments available; ensure data is truly empty and bail out.
    TestValidator.equals(
      "when there are no shipments, data should be empty array",
      baselinePage.data.length,
      0,
    );
    return;
  }

  // 3. Use one of the returned shipments as the basis for filter tests.
  const sampleShipment: IShoppingMallShipmentSearch.ISummary =
    baselinePage.data[0];
  typia.assert<IShoppingMallShipmentSearch.ISummary>(sampleShipment);

  // 3-A. Filter by shipment_codes.
  const shipmentCodeFilterRequest = {
    page,
    limit,
    shipment_codes: [sampleShipment.shipment_code],
  } satisfies IShoppingMallShipmentSearch.IRequest;

  const shipmentCodePage: IPageIShoppingMallShipmentSearch.ISummary =
    await api.functional.shoppingMall.customer.search.shipments.index(
      connection,
      {
        body: shipmentCodeFilterRequest,
      },
    );
  typia.assert<IPageIShoppingMallShipmentSearch.ISummary>(shipmentCodePage);
  typia.assert<IPage.IPagination>(shipmentCodePage.pagination);

  TestValidator.equals(
    "shipment-code filter pagination current equals requested page",
    shipmentCodePage.pagination.current,
    page,
  );
  TestValidator.equals(
    "shipment-code filter pagination limit equals requested limit",
    shipmentCodePage.pagination.limit,
    limit,
  );

  // All returned shipments must have shipment_code equal to the filtered one.
  await ArrayUtil.asyncForEach(
    shipmentCodePage.data,
    async (shipment, index) => {
      typia.assert<IShoppingMallShipmentSearch.ISummary>(shipment);
      TestValidator.equals(
        `shipment_codes filter enforces shipment_code at index ${index}`,
        shipment.shipment_code,
        sampleShipment.shipment_code,
      );
    },
  );

  // 3-B. Filter by order_codes when an order_code is available.
  const orderCode: string = sampleShipment.order.order_code;

  const orderCodeFilterRequest = {
    page,
    limit,
    order_codes: [orderCode],
  } satisfies IShoppingMallShipmentSearch.IRequest;

  const orderCodePage: IPageIShoppingMallShipmentSearch.ISummary =
    await api.functional.shoppingMall.customer.search.shipments.index(
      connection,
      {
        body: orderCodeFilterRequest,
      },
    );
  typia.assert<IPageIShoppingMallShipmentSearch.ISummary>(orderCodePage);
  typia.assert<IPage.IPagination>(orderCodePage.pagination);

  TestValidator.equals(
    "order-code filter pagination current equals requested page",
    orderCodePage.pagination.current,
    page,
  );
  TestValidator.equals(
    "order-code filter pagination limit equals requested limit",
    orderCodePage.pagination.limit,
    limit,
  );

  await ArrayUtil.asyncForEach(orderCodePage.data, async (shipment, index) => {
    typia.assert<IShoppingMallShipmentSearch.ISummary>(shipment);
    TestValidator.equals(
      `order_codes filter enforces order.order_code at index ${index}`,
      shipment.order.order_code,
      orderCode,
    );
  });
}
