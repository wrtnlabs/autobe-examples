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

/**
 * Validate shipment search filtering by shipping_status and carrier_names for
 * an authenticated customer, within the constraints of available APIs.
 *
 * Business flow (rewritten from original scenario because shipment creation
 * APIs are not available in this test context):
 *
 * 1. Register and authenticate a new customer using POST /auth/customer/join. The
 *    SDK automatically stores the access token into the connection.
 * 2. Call PATCH /shoppingMall/customer/search/shipments without filters to obtain
 *    a baseline page of shipments (if any exist for this customer).
 * 3. If shipments are returned, derive filter values from one shipment
 *    (shipping_status and carrier_name when available).
 * 4. Re-execute shipment search with:
 *
 *    - Only shipping_statuses filter.
 *    - Only carrier_names filter (when carrier_name is non-null).
 *    - Both filters combined (when carrier_name is non-null).
 * 5. For each filtered response, assert that every returned shipment matches the
 *    requested filters and that pagination metadata is structurally coherent.
 */
export async function test_api_customer_shipment_search_by_status_and_carrier(
  connection: api.IConnection,
) {
  // 1. Register (join) a customer and authenticate the connection.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://customer.example.com/join",
    referrer: "https://referrer.example.com/landing",
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customer);

  // 2. Perform an unfiltered shipment search with small pagination.
  const baseSearchRequest = {
    page: 1,
    limit: 5,
  } satisfies IShoppingMallShipmentSearch.IRequest;

  const basePage: IPageIShoppingMallShipmentSearch.ISummary =
    await api.functional.shoppingMall.customer.search.shipments.index(
      connection,
      { body: baseSearchRequest },
    );
  typia.assert<IPageIShoppingMallShipmentSearch.ISummary>(basePage);

  // Basic sanity checks on pagination metadata.
  const pagination = basePage.pagination;
  TestValidator.predicate(
    "pagination.current should be non-negative",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination.limit should be non-negative",
    pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination.records should be non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages should be non-negative",
    pagination.pages >= 0,
  );

  // If there are no shipments, we've validated structure; nothing further
  // can be asserted about filtering for this fresh customer.
  if (basePage.data.length === 0) return;

  const sample = basePage.data[0];

  // Defensive assertion on the sample structure.
  typia.assert<IShoppingMallShipmentSearch.ISummary>(sample);

  const sampleStatus: string = sample.shipping_status;
  const sampleCarrier: string | null | undefined = sample.carrier_name;

  // 3-a. Search by shipping_statuses only.
  const statusOnlyRequest = {
    shipping_statuses: [sampleStatus],
    page: 1,
    limit: 5,
  } satisfies IShoppingMallShipmentSearch.IRequest;

  const statusPage: IPageIShoppingMallShipmentSearch.ISummary =
    await api.functional.shoppingMall.customer.search.shipments.index(
      connection,
      { body: statusOnlyRequest },
    );
  typia.assert<IPageIShoppingMallShipmentSearch.ISummary>(statusPage);

  for (const shipment of statusPage.data) {
    typia.assert<IShoppingMallShipmentSearch.ISummary>(shipment);
    TestValidator.predicate(
      "shipment.shipping_status should match requested shipping_statuses",
      statusOnlyRequest.shipping_statuses!.includes(shipment.shipping_status),
    );
  }

  // 3-b/3-c. If carrier_name is present, test carrier_names-only and
  // combined filters.
  if (sampleCarrier !== null && sampleCarrier !== undefined) {
    const carrierOnlyRequest = {
      carrier_names: [sampleCarrier],
      page: 1,
      limit: 5,
    } satisfies IShoppingMallShipmentSearch.IRequest;

    const carrierPage: IPageIShoppingMallShipmentSearch.ISummary =
      await api.functional.shoppingMall.customer.search.shipments.index(
        connection,
        { body: carrierOnlyRequest },
      );
    typia.assert<IPageIShoppingMallShipmentSearch.ISummary>(carrierPage);

    for (const shipment of carrierPage.data) {
      typia.assert<IShoppingMallShipmentSearch.ISummary>(shipment);
      TestValidator.predicate(
        "shipment.carrier_name should be defined when filtering by carrier_names",
        shipment.carrier_name !== null && shipment.carrier_name !== undefined,
      );
      if (
        shipment.carrier_name !== null &&
        shipment.carrier_name !== undefined
      ) {
        TestValidator.predicate(
          "shipment.carrier_name should match requested carrier_names",
          carrierOnlyRequest.carrier_names!.includes(shipment.carrier_name),
        );
      }
    }

    const combinedRequest = {
      shipping_statuses: [sampleStatus],
      carrier_names: [sampleCarrier],
      page: 1,
      limit: 5,
    } satisfies IShoppingMallShipmentSearch.IRequest;

    const combinedPage: IPageIShoppingMallShipmentSearch.ISummary =
      await api.functional.shoppingMall.customer.search.shipments.index(
        connection,
        { body: combinedRequest },
      );
    typia.assert<IPageIShoppingMallShipmentSearch.ISummary>(combinedPage);

    for (const shipment of combinedPage.data) {
      typia.assert<IShoppingMallShipmentSearch.ISummary>(shipment);
      TestValidator.predicate(
        "combined filter: shipping_status must match",
        combinedRequest.shipping_statuses!.includes(shipment.shipping_status),
      );
      TestValidator.predicate(
        "combined filter: carrier_name must be non-null",
        shipment.carrier_name !== null && shipment.carrier_name !== undefined,
      );
      if (
        shipment.carrier_name !== null &&
        shipment.carrier_name !== undefined
      ) {
        TestValidator.predicate(
          "combined filter: carrier_name must match",
          combinedRequest.carrier_names!.includes(shipment.carrier_name),
        );
      }
    }
  }
}
