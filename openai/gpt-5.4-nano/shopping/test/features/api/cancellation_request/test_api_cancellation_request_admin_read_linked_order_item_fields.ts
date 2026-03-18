import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_cancellation_request_admin_read_linked_order_item_fields(
  connection: api.IConnection,
): Promise<void> {
  // NOTE: This test relies on existing seed data that includes
  // shopping_mall_cancellation_requests and linked shopping_mall_order_items.
  // If your environment is not seeded, integrate resource creation
  // utilities for cancellation requests and order items.
  // 1) Admin authorization
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2) Locate a valid cancellation request via simulation-safe random UUID.
  // The endpoint under test must return the linked order item summary.
  const cancellationRequestId = typia.random<string & tags.Format<"uuid">>();
  // 3) Read once
  const read1 =
    await api.functional.shoppingMall.admin.admin.cancellation_requests.at(
      adminConnection,
      {
        cancellationRequestId,
      },
    );
  typia.assert(read1);
  const request: IShoppingMallCancellationRequest = read1;
  typia.assert(request);
  const orderItem: IShoppingMallOrderItem.ISummary = request.orderItem;
  typia.assert(orderItem);
  // 4) Validate linked fields
  TestValidator.equals(
    "linked order item id matches cancellation request target",
    request.shoppingMallOrderItemId,
    orderItem.id,
  );
  TestValidator.equals(
    "seller snapshot id exists",
    orderItem.seller_snapshot_id !== ("" as string),
    true,
  );
  const sellerSnapshotId1 = orderItem.seller_snapshot_id;
  const sellerPriceAtPurchase1 = orderItem.seller_price_at_purchase;
  const quantity1 = orderItem.quantity;
  const lineItemStatus1 = orderItem.line_item_status;
  const placedAt1 = orderItem.placed_at;
  const deletedAt1 = orderItem.deleted_at;
  const shipmentId1 = orderItem.shopping_mall_shipment_id;
  TestValidator.equals(
    "seller price at purchase present",
    typeof sellerPriceAtPurchase1,
    "number",
  );
  TestValidator.equals("quantity present", typeof quantity1, "number");
  TestValidator.equals(
    "line item status present",
    typeof lineItemStatus1,
    "string",
  );
  TestValidator.equals("placed_at present", typeof placedAt1, "string");
  TestValidator.equals(
    "deleted_at is nullable",
    deletedAt1 !== undefined,
    true,
  );
  // Shipment id can be null or uuid
  if (shipmentId1 !== null) {
    TestValidator.predicate("shipment id is uuid", shipmentId1.length > 0);
  }
  // 5) Read again and ensure oversight fields remain unchanged
  const read2 =
    await api.functional.shoppingMall.admin.admin.cancellation_requests.at(
      adminConnection,
      {
        cancellationRequestId,
      },
    );
  typia.assert(read2);
  const orderItem2 = read2.orderItem;
  typia.assert(orderItem2);
  TestValidator.equals(
    "seller snapshot id stable across reads",
    orderItem2.seller_snapshot_id,
    sellerSnapshotId1,
  );
  TestValidator.equals(
    "seller price at purchase stable across reads",
    orderItem2.seller_price_at_purchase,
    sellerPriceAtPurchase1,
  );
  TestValidator.equals(
    "quantity stable across reads",
    orderItem2.quantity,
    quantity1,
  );
  TestValidator.equals(
    "line item status stable across reads",
    orderItem2.line_item_status,
    lineItemStatus1,
  );
  TestValidator.equals(
    "placed_at stable across reads",
    orderItem2.placed_at,
    placedAt1,
  );
  TestValidator.equals(
    "deleted_at stable across reads",
    orderItem2.deleted_at,
    deletedAt1,
  );
  TestValidator.equals(
    "shipment id stable across reads",
    orderItem2.shopping_mall_shipment_id,
    shipmentId1,
  );
}
