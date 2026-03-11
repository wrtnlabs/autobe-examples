import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
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
import { generate_random_ecommerce_mall_seller_orders_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_orders_shipments_create";
import { prepare_random_ecommerce_mall_order_item } from "../../../prepare/prepare_random_ecommerce_mall_order_item";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

export async function test_api_customer_shipments_viewing(
  connection: api.IConnection,
): Promise<void> {
  // Setup customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail: string = typia.random<string & tags.Format<"email">>() satisfies string;
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail satisfies string,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(customerAuth);
  // Login customer with stored password
  const customerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerLoginConnection, {
    body: {
      email: customerEmail satisfies string,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Setup seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail: string = typia.random<string & tags.Format<"email">>() satisfies string;
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail satisfies string,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerAuth);
  // Login seller with stored password
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerEmail satisfies string,
      password: sellerPassword,
    },
  });
  // Generate random order ID for testing
  const orderId: string = typia.random<string & tags.Format<"uuid">>();
  // Create a shipment as seller for the order
  const carrierNames = ["USPS", "FedEx", "DHL", "UPS"] as const;
  const shipment1 =
    await generate_random_ecommerce_mall_seller_orders_shipments_create(
      sellerLoginConnection,
      {
        body: {
          carrier_name: RandomGenerator.pick(carrierNames),
          tracking_number: RandomGenerator.alphaNumeric(12),
          order_items: [
            {
              quantity: 1,
              unit_price: typia.random<number & tags.Minimum<0>>(),
              product_id: typia.random<string & tags.Format<"uuid">>(),
              variant_id: typia.random<string & tags.Format<"uuid">>(),
              product_snapshot: JSON.stringify({ name: "Test Product" }),
              variant_snapshot: JSON.stringify({ sku_code: "SKU-001" }),
              seller_profile_snapshot: JSON.stringify({
                shop_name: "Test Shop",
              }),
            },
          ],
        },
        params: { orderId },
      },
    );
  typia.assert(shipment1);
  // Test 1: Customer views shipments for the order
  const shipmentsResponse =
    await api.functional.ecommerceMall.customer.orders.shipments.index(
      customerLoginConnection,
      {
        orderId,
        body: {
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(shipmentsResponse);
  // Verify pagination metadata
  TestValidator.equals(
    "page current is 1",
    shipmentsResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "page limit is 20",
    shipmentsResponse.pagination.limit,
    20,
  );
  TestValidator.equals(
    "page records count is 1",
    shipmentsResponse.pagination.records,
    1,
  );
  TestValidator.equals(
    "page pages count is 1",
    shipmentsResponse.pagination.pages,
    1,
  );
  // Verify shipments data
  TestValidator.equals(
    "shipments data length is 1",
    shipmentsResponse.data.length,
    1,
  );
  const shipment = shipmentsResponse.data[0];
  typia.assert(shipment);
  // Verify shipment fields
  TestValidator.equals(
    "carrier name matches",
    shipment.carrierName,
    shipment1.carrier_name,
  );
  TestValidator.equals(
    "tracking number matches",
    shipment.trackingNumber,
    shipment1.tracking_number,
  );
  TestValidator.equals(
    "order summary has id",
    shipment.order.id,
    shipment1.order.id,
  );
  TestValidator.equals(
    "seller summary has id",
    shipment.seller.id,
    shipment1.seller.id,
  );
  // Test 2: Test with order that has no shipments (empty response)
  const noShipmentsOrderId: string = typia.random<
    string & tags.Format<"uuid">
  >();
  const emptyShipmentsResponse =
    await api.functional.ecommerceMall.customer.orders.shipments.index(
      customerLoginConnection,
      {
        orderId: noShipmentsOrderId,
        body: {
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(emptyShipmentsResponse);
  // Verify empty response metadata
  TestValidator.equals(
    "empty page current is 1",
    emptyShipmentsResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty page limit is 20",
    emptyShipmentsResponse.pagination.limit,
    20,
  );
  TestValidator.equals(
    "empty page records is 0",
    emptyShipmentsResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty page pages is 0",
    emptyShipmentsResponse.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty data is empty array",
    emptyShipmentsResponse.data.length,
    0,
  );
  // Test 3: Test filtering by carrier name
  const carrierFilter = shipment.carrierName;
  const filteredShipmentsResponse =
    await api.functional.ecommerceMall.customer.orders.shipments.index(
      customerLoginConnection,
      {
        orderId,
        body: {
          page: 1,
          limit: 20,
          carrierName: carrierFilter,
        },
      },
    );
  typia.assert(filteredShipmentsResponse);
  TestValidator.equals(
    "filtered records matches carrier filter",
    filteredShipmentsResponse.pagination.records,
    1,
  );
  // Test 4: Test sorting by tracking number
  const sortTrackingResponse =
    await api.functional.ecommerceMall.customer.orders.shipments.index(
      customerLoginConnection,
      {
        orderId,
        body: {
          page: 1,
          limit: 20,
          sortBy: "trackingNumber",
          sortOrder: "asc",
        },
      },
    );
  typia.assert(sortTrackingResponse);
  TestValidator.equals(
    "sorted records count is 1",
    sortTrackingResponse.pagination.records,
    1,
  );
  // Test 5: Test pagination with different page
  const page2Response =
    await api.functional.ecommerceMall.customer.orders.shipments.index(
      customerLoginConnection,
      {
        orderId,
        body: {
          page: 2,
          limit: 20,
        },
      },
    );
  typia.assert(page2Response);
  TestValidator.equals(
    "page 2 current is 2",
    page2Response.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 records is 1",
    page2Response.pagination.records,
    1,
  );
  TestValidator.equals("page 2 pages is 1", page2Response.pagination.pages, 1);
}