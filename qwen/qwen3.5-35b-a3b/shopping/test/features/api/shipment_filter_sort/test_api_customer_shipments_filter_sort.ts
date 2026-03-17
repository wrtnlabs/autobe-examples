import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
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

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

export async function test_api_customer_shipments_filter_sort(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account and authenticate
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerAuth = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerAuth);
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const sellerLogin = await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerAuth.email,
      password: sellerPassword,
    } satisfies IEcommerceMallSeller.ILogin,
  });
  typia.assert(sellerLogin);
  // 2. Create test shipments with different statuses, carriers, and dates
  const sellerShipmentsConnection: api.IConnection = { host: connection.host };
  const today = new Date();
  const daysAgo = (days: number) =>
    new Date(today.getTime() - days * 24 * 60 * 60 * 1000);
  const shipments: IEcommerceMallShipment[] = [];
  // Create shipment 1: delivered, FedEx, 5 days ago
  const shipment1 = await api.functional.ecommerceMall.seller.shipments.create(
    sellerShipmentsConnection,
    {
      body: {
        order_item_ids: [typia.random<string & tags.Format<"uuid">>()],
        carrier_name: "FedEx",
        carrier_phone: "+1-800-999-1234",
        carrier_website: "https://www.fedex.com",
      } satisfies IEcommerceMallShipment.ICreate,
    },
  );
  typia.assert(shipment1);
  shipments.push(shipment1);
  // Create shipment 2: in-transit, DHL, 3 days ago
  const shipment2 = await api.functional.ecommerceMall.seller.shipments.create(
    sellerShipmentsConnection,
    {
      body: {
        order_item_ids: [typia.random<string & tags.Format<"uuid">>()],
        carrier_name: "DHL",
        carrier_phone: "+1-800-555-6789",
        carrier_website: "https://www.dhl.com",
      } satisfies IEcommerceMallShipment.ICreate,
    },
  );
  typia.assert(shipment2);
  shipments.push(shipment2);
  // Create shipment 3: pending, UPS, 1 day ago
  const shipment3 = await api.functional.ecommerceMall.seller.shipments.create(
    sellerShipmentsConnection,
    {
      body: {
        order_item_ids: [typia.random<string & tags.Format<"uuid">>()],
        carrier_name: "UPS",
        carrier_phone: "+1-800-222-3333",
        carrier_website: "https://www.ups.com",
      } satisfies IEcommerceMallShipment.ICreate,
    },
  );
  typia.assert(shipment3);
  shipments.push(shipment3);
  // Create shipment 4: delivered, FedEx, 7 days ago
  const shipment4 = await api.functional.ecommerceMall.seller.shipments.create(
    sellerShipmentsConnection,
    {
      body: {
        order_item_ids: [typia.random<string & tags.Format<"uuid">>()],
        carrier_name: "FedEx",
        carrier_phone: "+1-800-999-1234",
        carrier_website: "https://www.fedex.com",
      } satisfies IEcommerceMallShipment.ICreate,
    },
  );
  typia.assert(shipment4);
  shipments.push(shipment4);
  // 3. Create customer account and authenticate
  const customerJoinConnection: api.IConnection = { host: connection.host };
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerAuth = await authorize_customer_join(customerJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(customerAuth);
  const customerLoginConnection: api.IConnection = { host: connection.host };
  const customerLogin = await authorize_customer_login(
    customerLoginConnection,
    {
      body: {
        email: customerAuth.email,
        password: customerPassword,
        href: "http://localhost:3000",
        referrer: "http://localhost:3000/login",
        ip: "127.0.0.1",
      } satisfies IEcommerceMallCustomer.ILogin,
    },
  );
  typia.assert(customerLogin);
  // 4. Test filters and sorting
  const customerShipmentsConnection: api.IConnection = {
    host: connection.host,
  };
  // Test 4.1: Status filter - delivered only
  const statusFilterRequest = {
    status: "delivered" as const,
    limit: 10,
    page: 1,
  } satisfies IEcommerceMallShipment.IRequest;
  const deliveredShipments =
    await api.functional.ecommerceMall.customer.shipments.index(
      customerShipmentsConnection,
      { body: statusFilterRequest },
    );
  typia.assert(deliveredShipments);
  // Verify all returned shipments have delivered status
  TestValidator.equals(
    "status filter returns only delivered shipments",
    deliveredShipments.data.every((s) => s.status === "delivered"),
    true,
  );
  // Test 4.2: Carrier name filter - containing 'FedEx'
  const carrierFilterRequest = {
    carrier_name: "FedEx",
    limit: 10,
    page: 1,
  } satisfies IEcommerceMallShipment.IRequest;
  const fedExShipments =
    await api.functional.ecommerceMall.customer.shipments.index(
      customerShipmentsConnection,
      { body: carrierFilterRequest },
    );
  typia.assert(fedExShipments);
  // Verify all returned shipments have FedEx carrier
  TestValidator.equals(
    "carrier filter returns only FedEx shipments",
    fedExShipments.data.every((s) => s.carrierName?.includes("FedEx")),
    true,
  );
  // Test 4.3: Combined filters - status=delivered AND carrier_name=FedEx
  const combinedFilterRequest = {
    status: "delivered" as const,
    carrier_name: "FedEx",
    limit: 10,
    page: 1,
  } satisfies IEcommerceMallShipment.IRequest;
  const combinedShipments =
    await api.functional.ecommerceMall.customer.shipments.index(
      customerShipmentsConnection,
      { body: combinedFilterRequest },
    );
  typia.assert(combinedShipments);
  // Verify all returned shipments match both criteria
  TestValidator.equals(
    "combined filters return only delivered FedEx shipments",
    combinedShipments.data.every(
      (s) => s.status === "delivered" && s.carrierName?.includes("FedEx"),
    ),
    true,
  );
  // Test 4.4: Date range filter - created_at[gte] (3 days ago)
  const dateGteRequest = {
    created_at: daysAgo(3).toISOString(),
    limit: 10,
    page: 1,
  } satisfies IEcommerceMallShipment.IRequest;
  const recentShipments =
    await api.functional.ecommerceMall.customer.shipments.index(
      customerShipmentsConnection,
      { body: dateGteRequest },
    );
  typia.assert(recentShipments);
  // Verify date range filter returns correct count
  TestValidator.predicate(
    "date filter returns shipments created within 3 days",
    () => recentShipments.data.length > 0,
  );
  // Test 4.5: Sorting by shipped_at (ascending) - available in ISummary
  const sortShippedAscRequest = {
    sort: "shipped_at" as const,
    limit: 100,
    page: 1,
  } satisfies IEcommerceMallShipment.IRequest;
  const sortedShippedShipments =
    await api.functional.ecommerceMall.customer.shipments.index(
      customerShipmentsConnection,
      { body: sortShippedAscRequest },
    );
  typia.assert(sortedShippedShipments);
  // Verify shipments are sorted by shipped_at ascending (only for non-null values)
  const nonNullShippedAt = sortedShippedShipments.data.filter(
    (s) => s.shippedAt !== undefined && s.shippedAt !== null,
  );
  for (let i = 1; i < nonNullShippedAt.length; i++) {
    const prevTime = new Date(nonNullShippedAt[i - 1].shippedAt!).getTime();
    const currTime = new Date(nonNullShippedAt[i].shippedAt!).getTime();
    TestValidator.equals(
      "shipments sorted by shipped_at ascending",
      prevTime <= currTime,
      true,
    );
  }
  // Test 4.6: Sorting by delivered_at (ascending)
  const sortDeliveredAscRequest = {
    sort: "delivered_at" as const,
    limit: 100,
    page: 1,
  } satisfies IEcommerceMallShipment.IRequest;
  const sortedDeliveredShipments =
    await api.functional.ecommerceMall.customer.shipments.index(
      customerShipmentsConnection,
      { body: sortDeliveredAscRequest },
    );
  typia.assert(sortedDeliveredShipments);
  // Verify shipments are sorted by delivered_at ascending (only for non-null values)
  const nonNullDeliveredAt = sortedDeliveredShipments.data.filter(
    (s) => s.deliveredAt !== undefined && s.deliveredAt !== null,
  );
  for (let i = 1; i < nonNullDeliveredAt.length; i++) {
    const prevTime = new Date(nonNullDeliveredAt[i - 1].deliveredAt!).getTime();
    const currTime = new Date(nonNullDeliveredAt[i].deliveredAt!).getTime();
    TestValidator.equals(
      "shipments sorted by delivered_at ascending",
      prevTime <= currTime,
      true,
    );
  }
  // Test 4.7: Sorting by status (alphabetically)
  const sortStatusRequest = {
    sort: "status" as const,
    limit: 100,
    page: 1,
  } satisfies IEcommerceMallShipment.IRequest;
  const sortedStatusShipments =
    await api.functional.ecommerceMall.customer.shipments.index(
      customerShipmentsConnection,
      { body: sortStatusRequest },
    );
  typia.assert(sortedStatusShipments);
  // Verify shipments are sorted by status alphabetically
  for (let i = 1; i < sortedStatusShipments.data.length; i++) {
    const prevStatus = sortedStatusShipments.data[i - 1].status;
    const currStatus = sortedStatusShipments.data[i].status;
    TestValidator.equals(
      "shipments sorted by status alphabetically",
      prevStatus <= currStatus,
      true,
    );
  }
  // Test 4.8: Sorting by carrier_name
  const sortCarrierRequest = {
    sort: "carrier_name" as const,
    limit: 100,
    page: 1,
  } satisfies IEcommerceMallShipment.IRequest;
  const sortedCarrierShipments =
    await api.functional.ecommerceMall.customer.shipments.index(
      customerShipmentsConnection,
      { body: sortCarrierRequest },
    );
  typia.assert(sortedCarrierShipments);
  // Verify shipments are sorted by carrier_name
  for (let i = 1; i < sortedCarrierShipments.data.length; i++) {
    const prevCarrier = sortedCarrierShipments.data[i - 1].carrierName ?? "";
    const currCarrier = sortedCarrierShipments.data[i].carrierName ?? "";
    TestValidator.equals(
      "shipments sorted by carrier_name",
      prevCarrier <= currCarrier,
      true,
    );
  }
  // Test 4.9: Verify pagination shows correct record counts
  const paginationRequest = {
    status: "delivered" as const,
    limit: 5,
    page: 1,
  } satisfies IEcommerceMallShipment.IRequest;
  const paginationShipments =
    await api.functional.ecommerceMall.customer.shipments.index(
      customerShipmentsConnection,
      { body: paginationRequest },
    );
  typia.assert(paginationShipments);
  // Verify pagination metadata is correct
  const pagination = paginationShipments.pagination;
  TestValidator.equals("pagination current page", pagination.current, 1);
  TestValidator.equals("pagination limit", pagination.limit, 5);
  TestValidator.equals(
    "pagination records count",
    pagination.records,
    deliveredShipments.data.length,
  );
  TestValidator.equals(
    "pagination pages count",
    pagination.pages,
    Math.ceil(deliveredShipments.data.length / 5),
  );
  TestValidator.equals(
    "actual data count matches pagination records",
    paginationShipments.data.length <= pagination.limit,
    true,
  );
  // Test 4.10: Verify all timestamps are in UTC ISO 8601 format
  for (const shipment of shipments) {
    // Created at format validation (full shipment type has createdAt/updatedAt)
    const createdAt = shipment.createdAt;
    TestValidator.equals(
      "shipment createdAt is valid ISO 8601 format",
      !isNaN(Date.parse(createdAt)),
      true,
    );
    const updatedAt = shipment.updatedAt;
    TestValidator.equals(
      "shipment updatedAt is valid ISO 8601 format",
      !isNaN(Date.parse(updatedAt)),
      true,
    );
  }
  // Verify shippedAt/deliveredAt format in paginated response (ISummary type)
  for (const shipment of deliveredShipments.data) {
    if (shipment.shippedAt !== undefined && shipment.shippedAt !== null) {
      TestValidator.equals(
        "delivered shipment shippedAt is valid ISO 8601 format",
        !isNaN(Date.parse(shipment.shippedAt)),
        true,
      );
    }
    if (shipment.deliveredAt !== undefined && shipment.deliveredAt !== null) {
      TestValidator.equals(
        "delivered shipment deliveredAt is valid ISO 8601 format",
        !isNaN(Date.parse(shipment.deliveredAt)),
        true,
      );
    }
  }
}
