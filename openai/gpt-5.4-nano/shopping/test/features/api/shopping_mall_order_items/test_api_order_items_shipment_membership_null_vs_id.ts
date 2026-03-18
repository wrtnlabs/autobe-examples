import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_order_items_shipment_membership_null_vs_id(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth: IShoppingMallMember.IAuthorized =
    await authorize_member_join(memberConnection, {});
  typia.assert(memberAuth);
  // 1) shipmentId = null => unshipped items
  const unshippedPage: IPageIShoppingMallOrderItem.ISummary =
    await api.functional.shoppingMall.member.order_items.index(
      memberConnection,
      {
        body: {
          shipmentId: null,
          limit: 5,
          sortDirection: "desc",
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(unshippedPage);
  TestValidator.predicate(
    "unshippedPage only returns shopping_mall_shipment_id = null",
    () => unshippedPage.data.every((i) => i.shopping_mall_shipment_id === null),
  );
  // 2) Obtain a non-null shipment id for this member (by querying without shipmentId filter)
  const anyShipmentPage: IPageIShoppingMallOrderItem.ISummary =
    await api.functional.shoppingMall.member.order_items.index(
      memberConnection,
      {
        body: {
          limit: 20,
          sortDirection: "desc",
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(anyShipmentPage);
  const candidateShipmentId = anyShipmentPage.data.find(
    (i) => i.shopping_mall_shipment_id !== null,
  )?.shopping_mall_shipment_id;
  if (!candidateShipmentId) {
    // If this member currently has no shipped items, then querying a specific shipment
    // id is not possible from results; ensure the null-query remains valid.
    return;
  }
  // 3) shipmentId = candidate => shipped items with exact match
  const shippedPage: IPageIShoppingMallOrderItem.ISummary =
    await api.functional.shoppingMall.member.order_items.index(
      memberConnection,
      {
        body: {
          shipmentId: candidateShipmentId,
          limit: 5,
          sortDirection: "desc",
        } satisfies IShoppingMallOrderItem.IRequest,
      },
    );
  typia.assert(shippedPage);
  TestValidator.predicate(
    "shippedPage only returns shopping_mall_shipment_id equal to candidateShipmentId",
    () =>
      shippedPage.data.every(
        (i) => i.shopping_mall_shipment_id === candidateShipmentId,
      ),
  );
  // 4) Disjointness by shopping_mall_shipment_id (null vs specific UUID)
  TestValidator.predicate("disjoint shipment membership", () => {
    for (const i of unshippedPage.data) {
      if (i.shopping_mall_shipment_id !== null) return false;
    }
    for (const i of shippedPage.data) {
      if (i.shopping_mall_shipment_id === null) return false;
      if (i.shopping_mall_shipment_id !== candidateShipmentId) return false;
    }
    return true;
  });
}
