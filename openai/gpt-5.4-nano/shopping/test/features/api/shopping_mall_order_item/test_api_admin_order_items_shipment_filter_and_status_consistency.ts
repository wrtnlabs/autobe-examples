import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_order_items_shipment_filter_and_status_consistency(
  connection: api.IConnection,
): Promise<void> {
  // 1) Admin authentication (use join to ensure we have a session)
  const adminConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.Format<"password">>();
  await authorize_admin_join(adminConnection, {
    body: {
      email,
      password,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  const page1 = await api.functional.shoppingMall.admin.admin.order_items.index(
    adminConnection,
    {
      body: {
        shipmentId: null,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallOrderItem.IRequest,
    },
  );
  typia.assert(page1);
  for (const item of page1.data) {
    TestValidator.equals(
      "shipmentId should be null",
      item.shopping_mall_shipment_id,
      null,
    );
  }
  // 2) Find a non-null shipmentId to filter
  let specificShipmentId: (string & tags.Format<"uuid">) | undefined;
  for (const item of page1.data) {
    if (item.shopping_mall_shipment_id !== null) {
      specificShipmentId = item.shopping_mall_shipment_id;
      break;
    }
  }
  if (specificShipmentId === undefined) {
    const pageNoShipmentFilter =
      await api.functional.shoppingMall.admin.admin.order_items.index(
        adminConnection,
        {
          body: {
            page: 1,
            limit: 10,
          } satisfies IShoppingMallOrderItem.IRequest,
        },
      );
    typia.assert(pageNoShipmentFilter);

    const foundItem = pageNoShipmentFilter.data.find(
      (x) => x.shopping_mall_shipment_id !== null,
    );
    specificShipmentId =
      foundItem?.shopping_mall_shipment_id !== null
        ? foundItem?.shopping_mall_shipment_id
        : undefined;
  }
  if (specificShipmentId === undefined) {
    // No non-null shipment items exist in this environment.
    return;
  }
  // Pick a status value from the null-shipment result set for a stable follow-up filter.
  const pickedStatus: string | undefined =
    page1.data.length > 0 ? page1.data[0].line_item_status : undefined;
  const page2 = await api.functional.shoppingMall.admin.admin.order_items.index(
    adminConnection,
    {
      body: {
        shipmentId: specificShipmentId,
        page: 1,
        limit: 10,
        lineItemStatus: pickedStatus,
      } satisfies IShoppingMallOrderItem.IRequest,
    },
  );
  typia.assert(page2);
  for (const item of page2.data) {
    TestValidator.equals(
      "shipmentId should match filter",
      item.shopping_mall_shipment_id,
      specificShipmentId,
    );
  }
  // 3) Status/shipment consistency re-query using the same filters.
  if (pickedStatus !== undefined) {
    const page3 =
      await api.functional.shoppingMall.admin.admin.order_items.index(
        adminConnection,
        {
          body: {
            shipmentId: specificShipmentId,
            page: 1,
            limit: 10,
            lineItemStatus: pickedStatus,
          } satisfies IShoppingMallOrderItem.IRequest,
        },
      );
    typia.assert(page3);
    for (const item of page3.data) {
      TestValidator.equals(
        "line_item_status should match filter",
        item.line_item_status,
        pickedStatus,
      );
      TestValidator.equals(
        "shipmentId should remain consistent",
        item.shopping_mall_shipment_id,
        specificShipmentId,
      );
    }
  }
}
