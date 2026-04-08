import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
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

export async function test_api_admin_shipments_search_by_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // Test 1: Search shipments with 'in_transit' status filter
  const inTransitRequest = {
    orderId: null,
    sellerId: null,
    carrierName: null,
    status: "in_transit" as const,
    shippedAtFrom: null,
    shippedAtTo: null,
    page: 1,
    limit: 10,
    search: null,
    sort: null,
    order: null,
  } satisfies IEcommerceMallShipment.IRequest;
  const inTransitResult =
    await api.functional.ecommerceMall.admin.shipments.index(adminConnection, {
      body: inTransitRequest,
    });
  typia.assert(inTransitResult);
  // Validate pagination structure
  TestValidator.predicate(
    "in_transit pagination has valid current page",
    inTransitResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "in_transit pagination has valid limit",
    inTransitResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "in_transit pagination has non-negative records",
    inTransitResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "in_transit pagination has valid pages",
    inTransitResult.pagination.pages >= 0,
  );
  // Validate that returned shipments match in_transit status
  inTransitResult.data.forEach((shipment) => {
    TestValidator.equals(
      "shipment delivery status is in_transit",
      shipment.deliveryStatus,
      "in_transit",
    );
  });
  // Test 2: Search shipments with 'delivered' status filter
  const deliveredRequest = {
    orderId: null,
    sellerId: null,
    carrierName: null,
    status: "delivered" as const,
    shippedAtFrom: null,
    shippedAtTo: null,
    page: 1,
    limit: 10,
    search: null,
    sort: null,
    order: null,
  } satisfies IEcommerceMallShipment.IRequest;
  const deliveredResult =
    await api.functional.ecommerceMall.admin.shipments.index(adminConnection, {
      body: deliveredRequest,
    });
  typia.assert(deliveredResult);
  // Validate pagination structure
  TestValidator.predicate(
    "delivered pagination has valid current page",
    deliveredResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "delivered pagination has valid limit",
    deliveredResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "delivered pagination has non-negative records",
    deliveredResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "delivered pagination has valid pages",
    deliveredResult.pagination.pages >= 0,
  );
  // Validate that returned shipments match delivered status
  deliveredResult.data.forEach((shipment) => {
    TestValidator.equals(
      "shipment delivery status is delivered",
      shipment.deliveryStatus,
      "delivered",
    );
  });
  // Test 3: Test pagination controls with custom page and limit
  const paginationRequest = {
    orderId: null,
    sellerId: null,
    carrierName: null,
    status: null,
    shippedAtFrom: null,
    shippedAtTo: null,
    page: 1,
    limit: 5,
    search: null,
    sort: null,
    order: null,
  } satisfies IEcommerceMallShipment.IRequest;
  const paginationResult =
    await api.functional.ecommerceMall.admin.shipments.index(adminConnection, {
      body: paginationRequest,
    });
  typia.assert(paginationResult);
  // Validate pagination values match request
  TestValidator.equals(
    "pagination current page matches request",
    paginationResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    paginationResult.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "pagination returned data length within limit",
    paginationResult.data.length <= 5,
  );
  // Test 4: Test unauthorized access (base connection without authentication)
  await TestValidator.httpError(
    "unauthorized access should fail",
    401,
    async () => {
      const unauthorizedConnection: api.IConnection = { host: connection.host };
      await api.functional.ecommerceMall.admin.shipments.index(
        unauthorizedConnection,
        {
          body: {
            orderId: null,
            sellerId: null,
            carrierName: null,
            status: null,
            shippedAtFrom: null,
            shippedAtTo: null,
            page: 1,
            limit: 10,
            search: null,
            sort: null,
            order: null,
          } satisfies IEcommerceMallShipment.IRequest,
        },
      );
    },
  );
}
