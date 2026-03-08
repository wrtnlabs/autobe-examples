import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipment";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_shipment_filter_delivery_status(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test that the delivery status filter correctly distinguishes between
   * in-transit and delivered shipments.
   *
   * **Prerequisites:**
   * - Seller account must be authenticated
   * - The endpoint filters shipments based on delivered_at column
   *
   * **Test Steps:**
   * 1. Authenticate as a seller
   * 2. Request shipments with delivered=true filter
   * 3. Verify all returned shipments have delivered_at populated
   * 4. Request shipments with delivered=false filter
   * 5. Verify all returned shipments have delivered_at set to null
   * 6. Request shipments without delivered filter
   * 7. Verify response contains both types if available
   */
  // 1. Create and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 2. Request shipments with delivered=true filter
  const deliveredPage =
    await api.functional.shoppingMall.seller.shipments.index(sellerConnection, {
      body: {
        delivered: true,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallShipment.IRequest,
    });
  typia.assert(deliveredPage);
  // 3. Verify all returned shipments have delivered_at populated (not null)
  for (const shipment of deliveredPage.data) {
    TestValidator.predicate(
      "delivered=true should return shipments with delivered_at not null",
      shipment.delivered_at !== null,
    );
  }
  // 4. Request shipments with delivered=false filter
  const inTransitPage =
    await api.functional.shoppingMall.seller.shipments.index(sellerConnection, {
      body: {
        delivered: false,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallShipment.IRequest,
    });
  typia.assert(inTransitPage);
  // 5. Verify all returned shipments have delivered_at set to null
  for (const shipment of inTransitPage.data) {
    TestValidator.predicate(
      "delivered=false should return shipments with delivered_at null",
      shipment.delivered_at === null,
    );
  }
  // 6. Request shipments without delivered filter (omit the parameter)
  const allShipmentsPage =
    await api.functional.shoppingMall.seller.shipments.index(sellerConnection, {
      body: {
        page: 1,
        limit: 20,
      } satisfies IShoppingMallShipment.IRequest,
    });
  typia.assert(allShipmentsPage);
  // 7. Verify pagination structure
  TestValidator.predicate(
    "pagination current page should be 1",
    allShipmentsPage.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit should match requested",
    allShipmentsPage.pagination.limit === 20,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    allShipmentsPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    allShipmentsPage.pagination.pages >= 0,
  );
  // 8. Verify seller ownership filtering - all shipments belong to the authenticated seller
  for (const shipment of allShipmentsPage.data) {
    TestValidator.equals(
      "shipment seller should be the authenticated seller",
      shipment.seller.id,
      sellerAuth.id,
    );
  }
}
