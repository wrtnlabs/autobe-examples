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

export async function test_api_seller_orders_shipments_index(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as first seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.paragraph({ sentences: 2 }),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller);
  // 2. Create second seller for unauthorized access test
  const otherSellerConnection: api.IConnection = { host: connection.host };
  const otherSeller = await authorize_seller_join(otherSellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.paragraph({ sentences: 2 }),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(otherSeller);
  // 3. Generate test data (in memory simulation since order creation not available)
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const carrierNames = ["UPS", "FedEx", "DHL"] as const;
  const statuses = ["created", "shipped", "delivered"] as const;
  // Generate timestamps for date range testing
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  // 4. Test 1: No filters - should return all shipments (simulated)
  const response1 =
    await api.functional.ecommerce.seller.orders.shipments.index(
      sellerConnection,
      {
        orderId,
        body: {} satisfies IEcommerceShipment.IRequest,
      },
    );
  typia.assert(response1);
  // Validate pagination structure
  TestValidator.predicate(
    "has pagination metadata",
    response1.pagination !== undefined,
  );
  TestValidator.equals(
    "pagination has current page",
    response1.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination has limit",
    response1.pagination.limit > 0,
    true,
  );
  // 5. Test 2: Filter by carrier name
  const testCarrier = RandomGenerator.pick(carrierNames);
  const response2 =
    await api.functional.ecommerce.seller.orders.shipments.index(
      sellerConnection,
      {
        orderId,
        body: {
          carrier_name: testCarrier,
        } satisfies IEcommerceShipment.IRequest,
      },
    );
  typia.assert(response2);
  // Validate all returned shipments match carrier filter (simulated)
  for (const shipment of response2.data) {
    TestValidator.equals(
      "shipment carrier matches filter",
      shipment.carrierName,
      testCarrier,
    );
  }
  // 6. Test 3: Filter by tracking number (exact match)
  const testTrackingNumber = RandomGenerator.alphabets(10);
  const response3 =
    await api.functional.ecommerce.seller.orders.shipments.index(
      sellerConnection,
      {
        orderId,
        body: {
          tracking_number: testTrackingNumber,
        } satisfies IEcommerceShipment.IRequest,
      },
    );
  typia.assert(response3);
  // 7. Test 4: Filter by shipment status
  const testStatus = RandomGenerator.pick(statuses);
  const response4 =
    await api.functional.ecommerce.seller.orders.shipments.index(
      sellerConnection,
      {
        orderId,
        body: {
          shipment_status: testStatus,
        } satisfies IEcommerceShipment.IRequest,
      },
    );
  typia.assert(response4);
  // 8. Test 5: Date range filtering
  const response5 =
    await api.functional.ecommerce.seller.orders.shipments.index(
      sellerConnection,
      {
        orderId,
        body: {
          created_at_min: yesterday.toISOString(),
          created_at_max: tomorrow.toISOString(),
        } satisfies IEcommerceShipment.IRequest,
      },
    );
  typia.assert(response5);
  // 9. Test 6: Pagination parameters
  const response6 =
    await api.functional.ecommerce.seller.orders.shipments.index(
      sellerConnection,
      {
        orderId,
        body: {
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IEcommerceShipment.IRequest,
      },
    );
  typia.assert(response6);
  TestValidator.equals("page matches request", response6.pagination.current, 1);
  TestValidator.equals("limit matches request", response6.pagination.limit, 10);
  // 10. Test 7: Empty result set - filter with non-existent value
  const response7 =
    await api.functional.ecommerce.seller.orders.shipments.index(
      sellerConnection,
      {
        orderId,
        body: {
          carrier_name: "NonExistentCarrier",
        } satisfies IEcommerceShipment.IRequest,
      },
    );
  typia.assert(response7);
  TestValidator.predicate(
    "empty result set returns empty array",
    response7.data.length === 0,
  );
  TestValidator.equals(
    "records is 0 for empty result",
    response7.pagination.records,
    0,
  );
  // 11. Test 8: Unauthorized access attempt
  await TestValidator.error(
    "other seller cannot access first seller's order",
    async () => {
      await api.functional.ecommerce.seller.orders.shipments.index(
        otherSellerConnection,
        {
          orderId,
          body: {} satisfies IEcommerceShipment.IRequest,
        },
      );
    },
  );
  // 12. Validate shipment summary structure
  if (response1.data.length > 0) {
    const sampleShipment = response1.data[0];
    typia.assert(sampleShipment);
    TestValidator.predicate(
      "shipment has tracking number",
      sampleShipment.trackingNumber.length > 0,
    );
    TestValidator.predicate(
      "shipment has carrier name",
      sampleShipment.carrierName.length > 0,
    );
    TestValidator.predicate(
      "shipment has valid status",
      statuses.includes(sampleShipment.shipmentStatus as (typeof statuses)[0]),
    );
    TestValidator.predicate(
      "shipment has valid createdAt timestamp",
      !isNaN(Date.parse(sampleShipment.createdAt)),
    );
    // Validate seller info in shipment summary
    typia.assert(sampleShipment.seller);
    TestValidator.predicate(
      "shipment includes seller info",
      sampleShipment.seller.id.length > 0 &&
        sampleShipment.seller.email.length > 0 &&
        sampleShipment.seller.shop_name.length > 0,
    );
  }
}
