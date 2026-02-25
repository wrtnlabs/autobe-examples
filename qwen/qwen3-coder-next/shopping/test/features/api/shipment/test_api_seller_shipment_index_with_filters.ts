import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipment";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSessions";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_shipment_index_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create seller account and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: null,
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);
  // Create seller-specific connection with token from registration
  const sellerAuthConnection: api.IConnection = { host: connection.host };
  sellerAuthConnection.headers = {
    Authorization: seller.token.access,
  };
  // Test filtering by status - pending
  const pendingFilter =
    await api.functional.shoppingMall.seller.shipments.index(
      sellerAuthConnection,
      {
        body: {
          status: "pending",
          limit: 10,
        } satisfies IShoppingMallShipment.IRequest,
      },
    );
  typia.assert(pendingFilter);
  // Test filtering by status - shipped
  const shippedFilter =
    await api.functional.shoppingMall.seller.shipments.index(
      sellerAuthConnection,
      {
        body: {
          status: "shipped",
          limit: 10,
        } satisfies IShoppingMallShipment.IRequest,
      },
    );
  typia.assert(shippedFilter);
  // Test filtering by status - in_transit
  const inTransitFilter =
    await api.functional.shoppingMall.seller.shipments.index(
      sellerAuthConnection,
      {
        body: {
          status: "in_transit",
          limit: 10,
        } satisfies IShoppingMallShipment.IRequest,
      },
    );
  typia.assert(inTransitFilter);
  // Test filtering by status - delivered
  const deliveredFilter =
    await api.functional.shoppingMall.seller.shipments.index(
      sellerAuthConnection,
      {
        body: {
          status: "delivered",
          limit: 10,
        } satisfies IShoppingMallShipment.IRequest,
      },
    );
  typia.assert(deliveredFilter);
  // Test filtering by status - cancelled
  const cancelledFilter =
    await api.functional.shoppingMall.seller.shipments.index(
      sellerAuthConnection,
      {
        body: {
          status: "cancelled",
          limit: 10,
        } satisfies IShoppingMallShipment.IRequest,
      },
    );
  typia.assert(cancelledFilter);
  // Test filtering by carrier
  const carrierFilter =
    await api.functional.shoppingMall.seller.shipments.index(
      sellerAuthConnection,
      {
        body: {
          tracking_carrier: "KoreaExpress",
          limit: 10,
        } satisfies IShoppingMallShipment.IRequest,
      },
    );
  typia.assert(carrierFilter);
  // Test filtering by partial tracking number
  const trackingFilter =
    await api.functional.shoppingMall.seller.shipments.index(
      sellerAuthConnection,
      {
        body: {
          tracking_number: "TRK",
          limit: 10,
        } satisfies IShoppingMallShipment.IRequest,
      },
    );
  typia.assert(trackingFilter);
  // Test pagination
  const paginated = await api.functional.shoppingMall.seller.shipments.index(
    sellerAuthConnection,
    {
      body: {
        page: 1,
        limit: 5,
      } satisfies IShoppingMallShipment.IRequest,
    },
  );
  typia.assert(paginated);
  TestValidator.equals(
    "pagination limit correct",
    paginated.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    paginated.pagination.records >= 0,
  );
  // Test date range filtering
  const dateFilter = await api.functional.shoppingMall.seller.shipments.index(
    sellerAuthConnection,
    {
      body: {
        created_at_start: new Date(
          Date.now() - 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        created_at_end: new Date().toISOString(),
        limit: 10,
      } satisfies IShoppingMallShipment.IRequest,
    },
  );
  typia.assert(dateFilter);
  // Test combined filters
  const combinedFilter =
    await api.functional.shoppingMall.seller.shipments.index(
      sellerAuthConnection,
      {
        body: {
          status: "pending",
          tracking_carrier: "KoreaExpress",
          tracking_number: "",
          limit: 10,
        } satisfies IShoppingMallShipment.IRequest,
      },
    );
  typia.assert(combinedFilter);
  // Test empty filter (all shipments)
  const allShipments = await api.functional.shoppingMall.seller.shipments.index(
    sellerAuthConnection,
    {
      body: {
        limit: 100,
      } satisfies IShoppingMallShipment.IRequest,
    },
  );
  typia.assert(allShipments);
  // Validate response structure
  TestValidator.equals("data is array", Array.isArray(allShipments.data), true);
  TestValidator.equals(
    "pagination has required fields",
    allShipments.pagination.current >= 1 &&
      allShipments.pagination.limit >= 1 &&
      allShipments.pagination.records >= 0 &&
      allShipments.pagination.pages >= 0,
    true,
  );
}