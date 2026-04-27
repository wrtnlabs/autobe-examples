import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import type { IECommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_shipment_filter_by_delivery_status(
  connection: api.IConnection,
): Promise<void> {
  // Create a seller connection and register the seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 1. Filter by 'shipped' delivery status
  const shippedPage = await api.functional.eCommerceMall.seller.shipments.index(
    sellerConnection,
    {
      body: {
        deliveryStatus: "shipped",
      } satisfies IECommerceMallShipment.IRequest,
    },
  );
  typia.assert(shippedPage);
  for (const shipment of shippedPage.data) {
    TestValidator.predicate(
      "shipped shipment has null delivered_at",
      shipment.delivered_at === null,
    );
  }
  // 2. Filter by 'delivered' delivery status
  const deliveredPage =
    await api.functional.eCommerceMall.seller.shipments.index(
      sellerConnection,
      {
        body: {
          deliveryStatus: "delivered",
        } satisfies IECommerceMallShipment.IRequest,
      },
    );
  typia.assert(deliveredPage);
  for (const shipment of deliveredPage.data) {
    TestValidator.predicate(
      "delivered shipment has non-null delivered_at",
      shipment.delivered_at !== null,
    );
  }
  // 3. No deliveryStatus filter returns all shipments
  const allPage = await api.functional.eCommerceMall.seller.shipments.index(
    sellerConnection,
    {
      body: {} satisfies IECommerceMallShipment.IRequest,
    },
  );
  typia.assert(allPage);
  TestValidator.equals(
    "total records equals sum of shipped and delivered records",
    allPage.pagination.records,
    shippedPage.pagination.records + deliveredPage.pagination.records,
  );
  // 4. Combine deliveryStatus with pagination parameters
  const paginatedPage =
    await api.functional.eCommerceMall.seller.shipments.index(
      sellerConnection,
      {
        body: {
          deliveryStatus: "shipped",
          page: 1,
          limit: 10,
        } satisfies IECommerceMallShipment.IRequest,
      },
    );
  typia.assert(paginatedPage);
  TestValidator.equals(
    "pagination current page is 1",
    paginatedPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 10",
    paginatedPage.pagination.limit,
    10,
  );
  // All results must still satisfy the deliveryStatus filter
  for (const shipment of paginatedPage.data) {
    TestValidator.predicate(
      "paginated shipped shipment has null delivered_at",
      shipment.delivered_at === null,
    );
  }
}
