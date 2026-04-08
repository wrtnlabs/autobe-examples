import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test superAdmin advanced filtering capabilities with complex IEcommerceMallShipment.IRequest.
 * Validates pagination, sorting, filtering, and search functionality.
 */
export async function test_api_shipment_advanced_filter_pagination_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as superAdmin
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Test basic pagination - first page with default limit
  const page1Request = {
    orderId: null,
    sellerId: null,
    carrierName: null,
    status: null,
    shippedAtFrom: null,
    shippedAtTo: null,
    page: 1,
    limit: 10,
    search: null,
    sort: "shipped_at",
    order: "desc",
  } satisfies IEcommerceMallShipment.IRequest;
  const page1 = await api.functional.ecommerceMall.superAdmin.shipments.index(
    superAdminConnection,
    { body: page1Request },
  );
  typia.assert(page1);
  // 3. Verify pagination structure
  TestValidator.predicate("pagination exists", page1.pagination !== undefined);
  TestValidator.predicate("data array exists", Array.isArray(page1.data));
  TestValidator.predicate("current page is 1", page1.pagination.current === 1);
  TestValidator.predicate(
    "limit matches request",
    page1.pagination.limit === 10,
  );
  // 4. Test second page if data exists
  if (page1.pagination.pages > 1) {
    const page2Request = {
      ...page1Request,
      page: 2,
    } satisfies IEcommerceMallShipment.IRequest;
    const page2 = await api.functional.ecommerceMall.superAdmin.shipments.index(
      superAdminConnection,
      { body: page2Request },
    );
    typia.assert(page2);
    TestValidator.predicate(
      "page 2 data is different",
      page1.data.length === 0 ||
        page2.data.length === 0 ||
        page1.data[0]?.id !== page2.data[0]?.id,
    );
  }
  // 5. Test filtering by status - in_transit
  const inTransitRequest = {
    ...page1Request,
    status: "in_transit",
    page: 1,
  } satisfies IEcommerceMallShipment.IRequest;
  const inTransitResults =
    await api.functional.ecommerceMall.superAdmin.shipments.index(
      superAdminConnection,
      { body: inTransitRequest },
    );
  typia.assert(inTransitResults);
  // 6. Test filtering by status - delivered
  const deliveredRequest = {
    ...page1Request,
    status: "delivered",
    page: 1,
  } satisfies IEcommerceMallShipment.IRequest;
  const deliveredResults =
    await api.functional.ecommerceMall.superAdmin.shipments.index(
      superAdminConnection,
      { body: deliveredRequest },
    );
  typia.assert(deliveredResults);
  // 7. Test sorting by created_at ascending
  const sortCreatedAscRequest = {
    ...page1Request,
    sort: "created_at",
    order: "asc",
    page: 1,
  } satisfies IEcommerceMallShipment.IRequest;
  const sortedAscResults =
    await api.functional.ecommerceMall.superAdmin.shipments.index(
      superAdminConnection,
      { body: sortCreatedAscRequest },
    );
  typia.assert(sortedAscResults);
  // 8. Test sorting by carrier_name
  const sortCarrierRequest = {
    ...page1Request,
    sort: "carrier_name",
    order: "asc",
    page: 1,
  } satisfies IEcommerceMallShipment.IRequest;
  const sortedCarrierResults =
    await api.functional.ecommerceMall.superAdmin.shipments.index(
      superAdminConnection,
      { body: sortCarrierRequest },
    );
  typia.assert(sortedCarrierResults);
  // 9. Test search functionality
  if (page1.data.length > 0) {
    const sampleCarrier = page1.data[0]?.carrierName;
    const searchRequest = {
      ...page1Request,
      search: sampleCarrier?.substring(0, 3) ?? RandomGenerator.alphabets(3),
      page: 1,
    } satisfies IEcommerceMallShipment.IRequest;
    const searchResults =
      await api.functional.ecommerceMall.superAdmin.shipments.index(
        superAdminConnection,
        { body: searchRequest },
      );
    typia.assert(searchResults);
  }
  // 10. Test carrier name filter
  const carrierFilterRequest = {
    ...page1Request,
    carrierName: RandomGenerator.alphabets(3),
    page: 1,
  } satisfies IEcommerceMallShipment.IRequest;
  const carrierFilterResults =
    await api.functional.ecommerceMall.superAdmin.shipments.index(
      superAdminConnection,
      { body: carrierFilterRequest },
    );
  typia.assert(carrierFilterResults);
  // 11. Test time range filtering
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const timeRangeRequest = {
    ...page1Request,
    shippedAtFrom: thirtyDaysAgo.toISOString(),
    shippedAtTo: now.toISOString(),
    page: 1,
  } satisfies IEcommerceMallShipment.IRequest;
  const timeRangeResults =
    await api.functional.ecommerceMall.superAdmin.shipments.index(
      superAdminConnection,
      { body: timeRangeRequest },
    );
  typia.assert(timeRangeResults);
  // 12. Test empty result scenario with impossible filter
  const emptyRequest = {
    ...page1Request,
    carrierName: RandomGenerator.alphaNumeric(50),
    page: 1,
  } satisfies IEcommerceMallShipment.IRequest;
  const emptyResults =
    await api.functional.ecommerceMall.superAdmin.shipments.index(
      superAdminConnection,
      { body: emptyRequest },
    );
  typia.assert(emptyResults);
  TestValidator.predicate(
    "empty filter returns empty data array",
    emptyResults.data.length === 0,
  );
  TestValidator.predicate(
    "empty results have zero records",
    emptyResults.pagination.records === 0,
  );
}
