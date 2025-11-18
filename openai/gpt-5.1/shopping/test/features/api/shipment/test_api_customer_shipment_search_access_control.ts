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
 * Validate that shipment search is scoped per authenticated customer and does
 * not leak shipments belonging to other customers.
 *
 * High level steps:
 *
 * 1. Register Customer A and perform a broad shipment search as A.
 * 2. Collect A's shipment ids, shipment_codes, and order.order_code values.
 * 3. Register Customer B (which switches the SDK authorization to B).
 * 4. Perform the same broad search as B and ensure none of A's shipments appear.
 * 5. If A has any shipments, perform a targeted search as B using A's
 *    shipment_codes as filters and confirm that no A-owned shipments are
 *    returned.
 */
export async function test_api_customer_shipment_search_access_control(
  connection: api.IConnection,
) {
  // 1. Register Customer A
  const customerABody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // ip is optional; let server derive it by omitting
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerA: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerABody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerA);

  // 2. Perform a broad shipment search as Customer A
  const searchRequestA = {
    page: 1 satisfies number & tags.Type<"int32">,
    limit: 50 satisfies number & tags.Type<"int32">,
  } satisfies IShoppingMallShipmentSearch.IRequest;

  const pageA: IPageIShoppingMallShipmentSearch.ISummary =
    await api.functional.shoppingMall.customer.search.shipments.index(
      connection,
      { body: searchRequestA },
    );
  typia.assert<IPageIShoppingMallShipmentSearch.ISummary>(pageA);

  const aShipmentIds = pageA.data.map((s) => s.id);
  const aShipmentCodes = pageA.data.map((s) => s.shipment_code);
  const aOrderIds = pageA.data.map((s) => s.order.id);
  const aOrderCodes = pageA.data.map((s) => s.order.order_code);

  // Basic sanity check on A's pagination object
  typia.assert<IPage.IPagination>(pageA.pagination);

  // 3. Register Customer B (authorization token in connection will be switched)
  const customerBBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerB: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerBBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerB);

  TestValidator.notEquals(
    "customer A and B must be different accounts",
    customerA.id,
    customerB.id,
  );

  // 4. Perform the same broad search as Customer B
  const searchRequestB = {
    page: 1 satisfies number & tags.Type<"int32">,
    limit: 50 satisfies number & tags.Type<"int32">,
  } satisfies IShoppingMallShipmentSearch.IRequest;

  const pageB: IPageIShoppingMallShipmentSearch.ISummary =
    await api.functional.shoppingMall.customer.search.shipments.index(
      connection,
      { body: searchRequestB },
    );
  typia.assert<IPageIShoppingMallShipmentSearch.ISummary>(pageB);
  typia.assert<IPage.IPagination>(pageB.pagination);

  const bShipmentIds = pageB.data.map((s) => s.id);
  const bShipmentCodes = pageB.data.map((s) => s.shipment_code);
  const bOrderIds = pageB.data.map((s) => s.order.id);
  const bOrderCodes = pageB.data.map((s) => s.order.order_code);

  // 5. Assert that none of A's shipments appear in B's search results
  // If A has no shipments, this is trivially satisfied.
  TestValidator.predicate(
    "no overlapping shipment ids between customer A and B search results",
    aShipmentIds.every((id) => !bShipmentIds.includes(id)),
  );

  TestValidator.predicate(
    "no overlapping shipment codes between customer A and B search results",
    aShipmentCodes.every((code) => !bShipmentCodes.includes(code)),
  );

  TestValidator.predicate(
    "no overlapping order ids between customer A and B search results",
    aOrderIds.every((id) => !bOrderIds.includes(id)),
  );

  TestValidator.predicate(
    "no overlapping order codes between customer A and B search results",
    aOrderCodes.every((code) => !bOrderCodes.includes(code)),
  );

  // 6. If Customer A has at least one shipment, attempt targeted search from B
  if (aShipmentCodes.length > 0) {
    const targetedRequestB = {
      shipment_codes: aShipmentCodes,
      page: 1 satisfies number & tags.Type<"int32">,
      limit: 50 satisfies number & tags.Type<"int32">,
    } satisfies IShoppingMallShipmentSearch.IRequest;

    const targetedPageB: IPageIShoppingMallShipmentSearch.ISummary =
      await api.functional.shoppingMall.customer.search.shipments.index(
        connection,
        { body: targetedRequestB },
      );
    typia.assert<IPageIShoppingMallShipmentSearch.ISummary>(targetedPageB);
    typia.assert<IPage.IPagination>(targetedPageB.pagination);

    const targetedShipmentIdsB = targetedPageB.data.map((s) => s.id);
    const targetedShipmentCodesB = targetedPageB.data.map(
      (s) => s.shipment_code,
    );
    const targetedOrderIdsB = targetedPageB.data.map((s) => s.order.id);
    const targetedOrderCodesB = targetedPageB.data.map(
      (s) => s.order.order_code,
    );

    // Ensure that even when filtering by A's shipment_codes, B does not see A's shipments
    TestValidator.predicate(
      "targeted search by A's shipment_codes should not expose A's shipment ids to B",
      aShipmentIds.every((id) => !targetedShipmentIdsB.includes(id)),
    );

    TestValidator.predicate(
      "targeted search by A's shipment_codes should not expose A's shipment codes to B",
      aShipmentCodes.every((code) => !targetedShipmentCodesB.includes(code)),
    );

    TestValidator.predicate(
      "targeted search by A's shipment_codes should not expose A's order ids to B",
      aOrderIds.every((id) => !targetedOrderIdsB.includes(id)),
    );

    TestValidator.predicate(
      "targeted search by A's shipment_codes should not expose A's order codes to B",
      aOrderCodes.every((code) => !targetedOrderCodesB.includes(code)),
    );
  }
}
