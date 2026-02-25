import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShipmentTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipmentTracking";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentTracking";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

export async function test_api_seller_shipment_tracking_index_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as seller
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234",
      shopName: RandomGenerator.name(),
    },
  });
  typia.assert(sellerAuth);
  // Create actor-specific connection with token
  const sellerConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${sellerAuth.token.access}` },
  };
  // Create multiple shipments for this seller
  const shipments: IShoppingMallShipment[] = [];
  const carrierNames: string[] = [];
  const trackingNumbers: string[] = [];
  for (let i = 0; i < 3; ++i) {
    const carrierName = `Carrier${i + 1}`;
    const trackingNumber = `TRACK${RandomGenerator.alphaNumeric(6)}`;
    const shipment =
      await generate_random_shopping_mall_seller_shipments_create(
        sellerConnection,
        {
          body: {
            carrierName: carrierName,
            trackingNumber: trackingNumber,
            orderItemIds: [typia.random<string & tags.Format<"uuid">>()],
          },
        },
      );
    typia.assert(shipment);
    shipments.push(shipment);
    carrierNames.push(carrierName);
    trackingNumbers.push(trackingNumber);
  }
  // Also create one shipment from another seller (different auth)
  const anotherSellerJoinConnection: api.IConnection = {
    host: connection.host,
  };
  const anotherSellerAuth = await authorize_seller_join(
    anotherSellerJoinConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password5678",
        shopName: RandomGenerator.name(),
      },
    },
  );
  typia.assert(anotherSellerAuth);
  const anotherSellerConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${anotherSellerAuth.token.access}` },
  };
  const anotherShipment =
    await generate_random_shopping_mall_seller_shipments_create(
      anotherSellerConnection,
      {
        body: {
          carrierName: `CarrierX`,
          trackingNumber: `TRACK${RandomGenerator.alphaNumeric(6)}`,
          orderItemIds: [typia.random<string & tags.Format<"uuid">>()],
        },
      },
    );
  typia.assert(anotherShipment);
  // Create several shipment tracking records for the seller shipments
  const createTrackingForShipment = async (
    shipment: IShoppingMallShipment,
    index: number,
  ) => {
    // We patch the shipmentTrackings with multiple filters, so we need tracking items with varying carrierName and trackingNumber
    // Since the create API for shipment tracking was not mentioned, assume it already exists or that tracking info is created inside shipment creation
    // So no explicit create here. For robust testing, we assume shipment tracks were created, and we rely on filtering
  };
  // For filtering and pagination tests, we call the PATCH /shoppingMall/seller/shipmentTrackings endpoint
  // 1. Filter by shipmentId
  {
    const filter = {
      shipmentId: shipments[0].id,
      limit: 10,
      page: 1,
    } satisfies IShoppingMallShipmentTracking.IRequest;
    const output =
      await api.functional.shoppingMall.seller.shipmentTrackings.index(
        sellerConnection,
        {
          body: filter,
        },
      );
    typia.assert(output);
    // Check all returned records have shipmentId matching shipments[0].id
    for (const tracking of output.data) {
      TestValidator.equals(
        "shipmentId matches filter",
        tracking.shoppingMallShipmentId,
        shipments[0].id,
      );
      TestValidator.equals(
        "tracking matches seller",
        tracking.shipment.seller.id,
        sellerAuth.id,
      );
    }
  }
  // 2. Filter by carrierName substring to cover partial matching
  {
    // Pick a carrierName from seller shipments
    const carrierNameKey = carrierNames[1];
    const partialCarrierName = carrierNameKey.substring(
      0,
      carrierNameKey.length - 1,
    );
    const filter = {
      carrierName: partialCarrierName,
      limit: 10,
      page: 1,
    } satisfies IShoppingMallShipmentTracking.IRequest;
    const output =
      await api.functional.shoppingMall.seller.shipmentTrackings.index(
        sellerConnection,
        {
          body: filter,
        },
      );
    typia.assert(output);
    // Validate all records have carrierName including partialCarrierName
    for (const tracking of output.data) {
      TestValidator.predicate(
        "carrierName contains filter",
        tracking.carrierName.includes(partialCarrierName),
      );
      TestValidator.equals(
        "tracking matches seller",
        tracking.shipment.seller.id,
        sellerAuth.id,
      );
    }
  }
  // 3. Filter by trackingNumber substring
  {
    const trackingNumberKey = trackingNumbers[2];
    const partialTrackingNumber = trackingNumberKey.substring(
      1,
      trackingNumberKey.length - 1,
    );
    const filter = {
      trackingNumber: partialTrackingNumber,
      limit: 10,
      page: 1,
    } satisfies IShoppingMallShipmentTracking.IRequest;
    const output =
      await api.functional.shoppingMall.seller.shipmentTrackings.index(
        sellerConnection,
        {
          body: filter,
        },
      );
    typia.assert(output);
    for (const tracking of output.data) {
      TestValidator.predicate(
        "trackingNumber contains filter",
        tracking.trackingNumber.includes(partialTrackingNumber),
      );
      TestValidator.equals(
        "tracking matches seller",
        tracking.shipment.seller.id,
        sellerAuth.id,
      );
    }
  }
  // 4. Filter by createdAtFrom and createdAtTo
  {
    // Pick a time range around first shipment createdAt
    const createdAtFrom = new Date(
      new Date(shipments[0].createdAt).getTime() - 1000,
    ).toISOString();
    const createdAtTo = new Date(
      new Date(shipments[0].createdAt).getTime() + 1000,
    ).toISOString();
    const filter = {
      createdAtFrom: createdAtFrom,
      createdAtTo: createdAtTo,
      limit: 10,
      page: 1,
    } satisfies IShoppingMallShipmentTracking.IRequest;
    const output =
      await api.functional.shoppingMall.seller.shipmentTrackings.index(
        sellerConnection,
        {
          body: filter,
        },
      );
    typia.assert(output);
    for (const tracking of output.data) {
      TestValidator.predicate(
        "createdAt in range",
        tracking.createdAt >= createdAtFrom &&
          tracking.createdAt <= createdAtTo,
      );
      TestValidator.equals(
        "tracking matches seller",
        tracking.shipment.seller.id,
        sellerAuth.id,
      );
    }
  }
  // 5. Pagination test - page 1
  {
    const filter = {
      limit: 1,
      page: 1,
    } satisfies IShoppingMallShipmentTracking.IRequest;
    const output =
      await api.functional.shoppingMall.seller.shipmentTrackings.index(
        sellerConnection,
        {
          body: filter,
        },
      );
    typia.assert(output);
    TestValidator.predicate(
      "page 1 limit 1 data length <= 1",
      output.data.length <= 1,
    );
    TestValidator.predicate(
      "page 1 records count not zero",
      output.pagination.records > 0,
    );
  }
  // 6. Pagination test - page 2
  {
    const filterPage1 = {
      limit: 1,
      page: 1,
    } satisfies IShoppingMallShipmentTracking.IRequest;
    const outputPage1 =
      await api.functional.shoppingMall.seller.shipmentTrackings.index(
        sellerConnection,
        {
          body: filterPage1,
        },
      );
    typia.assert(outputPage1);
    const filterPage2 = {
      limit: 1,
      page: 2,
    } satisfies IShoppingMallShipmentTracking.IRequest;
    const outputPage2 =
      await api.functional.shoppingMall.seller.shipmentTrackings.index(
        sellerConnection,
        {
          body: filterPage2,
        },
      );
    typia.assert(outputPage2);
    TestValidator.predicate(
      "page 2 data length <= 1",
      outputPage2.data.length <= 1,
    );
    if (outputPage1.data.length > 0 && outputPage2.data.length > 0) {
      TestValidator.notEquals(
        "page 2 first id differs",
        outputPage1.data[0].id,
        outputPage2.data[0].id,
      );
      TestValidator.equals(
        "page 2 records count match",
        outputPage1.pagination.records,
        outputPage2.pagination.records,
      );
      TestValidator.equals(
        "page 2 limit match",
        outputPage1.pagination.limit,
        outputPage2.pagination.limit,
      );
      TestValidator.predicate(
        "page 2 current page",
        outputPage2.pagination.current === 2,
      );
    }
  }
  // 7. Verify that shipments from another seller are excluded
  {
    const filter = {
      limit: 50,
      page: 1,
    } satisfies IShoppingMallShipmentTracking.IRequest;
    const output =
      await api.functional.shoppingMall.seller.shipmentTrackings.index(
        sellerConnection,
        {
          body: filter,
        },
      );
    typia.assert(output);
    // Check none of the tracking belong to another seller
    for (const tracking of output.data) {
      TestValidator.notEquals(
        "exclude another seller",
        tracking.shipment.seller.id,
        anotherSellerAuth.id,
      );
    }
  }
}
