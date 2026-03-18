import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipment";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentConfirmation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentConfirmation";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_shopping_mall_member_orders_create } from "../../../generate/generate_random_shopping_mall_member_orders_create";
import { generate_random_shopping_mall_member_shipments_create } from "../../../generate/generate_random_shopping_mall_member_shipments_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";
import { prepare_random_shopping_mall_shipment_confirmation } from "../../../prepare/prepare_random_shopping_mall_shipment_confirmation";

export async function test_api_shipments_null_tracking_when_confirmation_missing(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallMember.IJoin,
  });
  const authorizedConnection: api.IConnection = { host: connection.host };
  authorizedConnection.headers = {
    ...(authorizedConnection.headers ?? {}),
    Authorization: auth.token.access,
  };
  const order = await generate_random_shopping_mall_member_orders_create(
    authorizedConnection,
    {},
  );
  typia.assert(order);
  const shipment = await generate_random_shopping_mall_member_shipments_create(
    authorizedConnection,
    {
      body: {
        shopping_mall_order_id: order.id,
        shopping_mall_order_item_ids: [order.orderItems[0]!.id],
        shipment_confirmation: null,
      } satisfies IShoppingMallShipment.ICreate,
    },
  );
  typia.assert(shipment);
  const page = await api.functional.shoppingMall.member.shipments.index(
    authorizedConnection,
    {
      body: {
        shopping_mall_order_id: order.id,
        page: 1,
        limit: 20,
      } satisfies IShoppingMallShipment.IRequest,
    },
  );
  typia.assert(page);
  const targeted = page.data.find((s) => s.id === shipment.id) ?? undefined;
  TestValidator.predicate(
    "shipment is included in listing",
    () => targeted !== undefined,
  );
  const safeTargeted = typia.assert(targeted!);
  const assertNullTracking = (s: IShoppingMallShipment.ISummary) => {
    TestValidator.equals("trackingUrl is null", s.trackingUrl, null);
    TestValidator.equals("trackingNumber is null", s.trackingNumber, null);
    TestValidator.equals("carrierName is null", s.carrierName, null);
    TestValidator.equals("confirmationType is null", s.confirmationType, null);
    TestValidator.equals("confirmedAt is null", s.confirmedAt, null);
  };
  // Validate targeted shipment
  assertNullTracking(safeTargeted);
  TestValidator.equals("order id matches", safeTargeted.order.id, order.id);
  // Negative containment: any other returned shipments for same order must also have null tracking
  TestValidator.predicate(
    "all returned shipments for the order have null tracking when confirmation is missing",
    () =>
      page.data.every(
        (s) =>
          s.trackingUrl === null &&
          s.trackingNumber === null &&
          s.carrierName === null &&
          s.confirmationType === null &&
          s.confirmedAt === null,
      ),
  );
}
