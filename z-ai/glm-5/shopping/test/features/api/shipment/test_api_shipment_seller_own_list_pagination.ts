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

export async function test_api_shipment_seller_own_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller-specific connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 2. Send PATCH request with pagination parameters (page=1, limit=10)
  const result = await api.functional.shoppingMall.seller.shipments.index(
    sellerConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallShipment.IRequest,
    },
  );
  typia.assert(result);
  // 3. Verify pagination metadata
  TestValidator.equals("current page is 1", result.pagination.current, 1);
  TestValidator.equals("limit is 10", result.pagination.limit, 10);
  TestValidator.predicate(
    "records is non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    result.pagination.pages >= 0,
  );
  // 4. Verify data is an array
  TestValidator.predicate("data is array", Array.isArray(result.data));
  // 5. Verify all shipments belong to authenticated seller
  await ArrayUtil.asyncForEach(result.data, async (shipment) => {
    TestValidator.equals(
      "shipment belongs to seller",
      shipment.seller.id,
      seller.id,
    );
    TestValidator.predicate(
      "shipment has required fields",
      shipment.id !== undefined &&
        shipment.carrier_name !== undefined &&
        shipment.tracking_number !== undefined &&
        shipment.shipped_at !== undefined &&
        shipment.created_at !== undefined,
    );
    TestValidator.predicate(
      "delivered_at is null or date-time",
      shipment.delivered_at === null ||
        typeof shipment.delivered_at === "string",
    );
  });
  // 6. Test second page pagination (if there are enough records)
  if (result.pagination.records > 5) {
    const page2Result =
      await api.functional.shoppingMall.seller.shipments.index(
        sellerConnection,
        {
          body: {
            page: 2,
            limit: 5,
          } satisfies IShoppingMallShipment.IRequest,
        },
      );
    typia.assert(page2Result);
    TestValidator.equals(
      "page 2 current is 2",
      page2Result.pagination.current,
      2,
    );
    TestValidator.equals("page 2 limit is 5", page2Result.pagination.limit, 5);
    TestValidator.equals(
      "total records consistent",
      page2Result.pagination.records,
      result.pagination.records,
    );
    // Verify all page 2 shipments also belong to seller
    await ArrayUtil.asyncForEach(page2Result.data, async (shipment) => {
      TestValidator.equals(
        "page 2 shipment belongs to seller",
        shipment.seller.id,
        seller.id,
      );
    });
  }
  // 7. Test empty data scenario with excessive page number
  const highPageResult =
    await api.functional.shoppingMall.seller.shipments.index(sellerConnection, {
      body: {
        page: 9999,
        limit: 10,
      } satisfies IShoppingMallShipment.IRequest,
    });
  typia.assert(highPageResult);
  TestValidator.predicate(
    "high page returns empty array",
    Array.isArray(highPageResult.data) && highPageResult.data.length === 0,
  );
}
