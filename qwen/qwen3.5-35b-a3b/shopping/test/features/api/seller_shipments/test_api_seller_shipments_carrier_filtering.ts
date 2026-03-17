import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
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

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

export async function test_api_seller_shipments_carrier_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // Create test shipments with different carriers
  const shipments: IEcommerceMallShipment[] = [];
  const carriers = ["FedEx", "DHL", "UPS", "USPS"] as const;
  const now = new Date();
  const daysAgo = (days: number): string =>
    new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
  // Create 4 shipments with different carriers
  for (let i = 0; i < 4; i++) {
    const orderItemIds: (string & tags.Format<"uuid">)[] = ArrayUtil.repeat(
      3,
      () => typia.random<string & tags.Format<"uuid">>(),
    );
    const shipment =
      await generate_random_ecommerce_mall_seller_shipments_create(
        sellerConnection,
        {
          body: {
            order_item_ids: orderItemIds,
            carrier_name: carriers[i] || null,
            carrier_phone: typia.random<string & tags.Format<"uri">>(),
            carrier_website: `${carriers[i]?.toLowerCase()}.com`,
            delivery_address: RandomGenerator.name() + " Street",
          } satisfies DeepPartial<IEcommerceMallShipment.ICreate>,
        },
      );
    typia.assert(shipment);
    shipments.push(shipment);
  }
  // Create shipment with null carrier name
  const nullCarrierShipment =
    await generate_random_ecommerce_mall_seller_shipments_create(
      sellerConnection,
      {
        body: {
          order_item_ids: ArrayUtil.repeat(2, () =>
            typia.random<string & tags.Format<"uuid">>(),
          ),
          carrier_name: null,
          delivery_address: RandomGenerator.name() + " Ave",
        } satisfies DeepPartial<IEcommerceMallShipment.ICreate>,
      },
    );
  typia.assert(nullCarrierShipment);
  shipments.push(nullCarrierShipment);
  // Wait to ensure created_at timestamps are different
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Test Case 1: Carrier name exact match
  {
    const response = await api.functional.ecommerceMall.seller.shipments.index(
      sellerConnection,
      {
        body: {
          carrier_name: "FedEx",
        },
      },
    );
    typia.assert(response);
    for (const shipment of response.data) {
      TestValidator.equals(
        "FedEx carrier filter - shipment carrierName",
        shipment.carrierName,
        "FedEx",
      );
    }
  }
  // Test Case 2: Carrier name partial match (LIKE search)
  {
    const response = await api.functional.ecommerceMall.seller.shipments.index(
      sellerConnection,
      {
        body: {
          carrier_name: "Fed",
        },
      },
    );
    typia.assert(response);
    for (const shipment of response.data) {
      const containsFed = shipment.carrierName?.toLowerCase().includes("fed");
      TestValidator.equals(
        "Fed partial match - shipment carrierName contains 'fed'",
        containsFed,
        true,
      );
    }
  }
  // Test Case 3: Status filter combined with carrier filter
  {
    const response = await api.functional.ecommerceMall.seller.shipments.index(
      sellerConnection,
      {
        body: {
          carrier_name: "DHL",
          status: "delivered",
        },
      },
    );
    typia.assert(response);
    for (const shipment of response.data) {
      TestValidator.equals(
        "DHL + delivered filter - carrierName",
        shipment.carrierName,
        "DHL",
      );
      TestValidator.equals(
        "DHL + delivered filter - status",
        shipment.status,
        "delivered",
      );
    }
  }
  // Test Case 4: Combined filters (carrier + status)
  {
    const response = await api.functional.ecommerceMall.seller.shipments.index(
      sellerConnection,
      {
        body: {
          carrier_name: "UPS",
          status: "pending",
        },
      },
    );
    typia.assert(response);
    for (const shipment of response.data) {
      TestValidator.equals(
        "Combined filter - carrierName",
        shipment.carrierName,
        "UPS",
      );
      TestValidator.equals(
        "Combined filter - status",
        shipment.status,
        "pending",
      );
    }
  }
  // Test Case 5: Sorting with filters
  {
    const response = await api.functional.ecommerceMall.seller.shipments.index(
      sellerConnection,
      {
        body: {
          carrier_name: "FedEx",
          sort: "created_at",
        },
      },
    );
    typia.assert(response);
    TestValidator.predicate(
      "Sorting with filter - response has data",
      () => response.data.length > 0,
    );
  }
  // Test Case 6: Verify pagination metadata reflects filtered results
  {
    const response = await api.functional.ecommerceMall.seller.shipments.index(
      sellerConnection,
      {
        body: {
          carrier_name: "DHL",
          limit: 10,
        },
      },
    );
    typia.assert(response);
    TestValidator.equals(
      "Pagination - records count matches data length",
      response.pagination.records,
      response.data.length,
    );
    TestValidator.predicate(
      "Pagination - records count <= total shipments",
      () => response.pagination.records <= shipments.length,
    );
  }
  // Test Case 7: No filter - all shipments returned
  {
    const response = await api.functional.ecommerceMall.seller.shipments.index(
      sellerConnection,
      {
        body: {},
      },
    );
    typia.assert(response);
    TestValidator.equals(
      "No filter - all shipments returned",
      response.data.length,
      shipments.length,
    );
  }
  // Test Case 8: Sorting by carrier name
  {
    const response = await api.functional.ecommerceMall.seller.shipments.index(
      sellerConnection,
      {
        body: {
          sort: "carrier_name",
        },
      },
    );
    typia.assert(response);
    TestValidator.predicate(
      "Sort by carrier_name - response has data",
      () => response.data.length > 0,
    );
  }
}
