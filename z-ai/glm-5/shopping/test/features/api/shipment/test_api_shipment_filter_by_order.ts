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

export async function test_api_shipment_filter_by_order(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
    },
  });
  // 2. Retrieve all shipments without order filter to identify an order ID
  const allShipments = await api.functional.shoppingMall.seller.shipments.index(
    sellerConnection,
    {
      body: {} satisfies IShoppingMallShipment.IRequest,
    },
  );
  typia.assert(allShipments);
  // 3. If there are shipments, test with an existing order ID
  if (allShipments.data.length > 0) {
    const firstShipment = allShipments.data[0];
    const orderId = firstShipment.order.id;
    // 4. Send PATCH request with orderId filter
    const filteredShipments =
      await api.functional.shoppingMall.seller.shipments.index(
        sellerConnection,
        {
          body: { orderId } satisfies IShoppingMallShipment.IRequest,
        },
      );
    typia.assert(filteredShipments);
    // 5. Verify all returned shipments have order.id matching the specified order ID
    for (const shipment of filteredShipments.data) {
      TestValidator.equals(
        "order ID matches filter",
        shipment.order.id,
        orderId,
      );
    }
    // 6. Verify order summary contains required fields
    for (const shipment of filteredShipments.data) {
      typia.assert(shipment.order);
      TestValidator.predicate("order has id", shipment.order.id !== undefined);
      TestValidator.predicate(
        "order has order_number",
        shipment.order.order_number !== undefined,
      );
      TestValidator.predicate(
        "order has total_price",
        typeof shipment.order.total_price === "number",
      );
      TestValidator.predicate(
        "order has status",
        shipment.order.status !== undefined,
      );
      // customer can be null for deleted customers
      TestValidator.predicate(
        "order has created_at",
        shipment.order.created_at !== undefined,
      );
    }
    // Verify that the filtered count is less than or equal to total count
    TestValidator.predicate(
      "filtered count <= total count",
      filteredShipments.data.length <= allShipments.data.length,
    );
  }
  // 7. Test with non-existent order ID - should return empty results, not error
  const nonExistentOrderId = typia.random<string & tags.Format<"uuid">>();
  const emptyResult = await api.functional.shoppingMall.seller.shipments.index(
    sellerConnection,
    {
      body: {
        orderId: nonExistentOrderId,
      } satisfies IShoppingMallShipment.IRequest,
    },
  );
  typia.assert(emptyResult);
  // Verify empty results for non-existent order ID
  TestValidator.equals(
    "non-existent order ID returns empty data",
    emptyResult.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records for empty result",
    emptyResult.pagination.records,
    0,
  );
}
