import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentConfirmation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentConfirmation";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_shopping_mall_member_shipments_create } from "../../../generate/generate_random_shopping_mall_member_shipments_create";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";
import { prepare_random_shopping_mall_shipment_confirmation } from "../../../prepare/prepare_random_shopping_mall_shipment_confirmation";

export async function test_api_shipment_admin_update_reconciles_shipment_linked_order_items(
  connection: api.IConnection,
): Promise<void> {
  // 1) Admin setup (join then login to ensure account exists)
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminJoined = await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminJoined);
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.ILogin,
  });
  // 2) Prepare member shipments (join then login)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberJoined = await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(memberJoined);
  await authorize_member_login(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IShoppingMallMember.ILogin,
  });
  const shipmentA = await generate_random_shopping_mall_member_shipments_create(
    memberConnection,
    {
      body: {
        shipment_confirmation: null,
      },
    },
  );
  typia.assert(shipmentA);
  const shipmentB = await generate_random_shopping_mall_member_shipments_create(
    memberConnection,
    {
      body: {
        shipment_confirmation: null,
      },
    },
  );
  typia.assert(shipmentB);
  // Baseline for shipmentA
  const baseA = await api.functional.shoppingMall.member.shipments.at(
    memberConnection,
    {
      shipmentId: shipmentA.id,
    },
  );
  typia.assert(baseA);
  // Baseline for shipmentB
  const baseB = await api.functional.shoppingMall.member.shipments.at(
    memberConnection,
    {
      shipmentId: shipmentB.id,
    },
  );
  typia.assert(baseB);
  const baseAMap: Record<string, string> = {};
  for (const oi of baseA.orderItems) {
    baseAMap[oi.id] = oi.line_item_status;
  }
  const baseBMap: Record<string, string> = {};
  for (const oi of baseB.orderItems) {
    baseBMap[oi.id] = oi.line_item_status;
  }
  // 3) Admin update shipmentA.status
  const nextStatus: string = `${baseA.status}_cancelled_refunded`;
  const updatedA =
    await api.functional.shoppingMall.admin.admin.shipments.update(
      adminConnection,
      {
        shipmentId: shipmentA.id,
        body: {
          status: nextStatus,
          confirmation_type: `${RandomGenerator.alphabets(10)}_confirmation`,
          confirmed_at: new Date().toISOString(),
          tracking_url: null,
          tracking_number: null,
          carrier_name: null,
          note: null,
        } satisfies IShoppingMallShipment.IUpdate,
      },
    );
  typia.assert(updatedA);
  // 4) Verify shipmentA.status updated
  TestValidator.equals("shipmentA.status updated", updatedA.status, nextStatus);
  const afterA = await api.functional.shoppingMall.member.shipments.at(
    memberConnection,
    {
      shipmentId: shipmentA.id,
    },
  );
  typia.assert(afterA);
  TestValidator.equals(
    "shipmentA orderItems count unchanged",
    afterA.orderItems.length,
    baseA.orderItems.length,
  );
  // At least one shipmentA-linked order item line_item_status should change
  let changedCountA = 0;
  for (const oi of afterA.orderItems) {
    const before = baseAMap[oi.id];
    TestValidator.predicate(
      "shipmentA orderItem id exists in baseline",
      before !== undefined,
    );
    if (before !== oi.line_item_status) changedCountA++;
  }
  TestValidator.predicate(
    "at least one shipmentA orderItem line_item_status changed",
    changedCountA >= 1,
  );
  // 5) Verify shipmentB isolation: none of shipmentB order items change
  const afterB = await api.functional.shoppingMall.member.shipments.at(
    memberConnection,
    {
      shipmentId: shipmentB.id,
    },
  );
  typia.assert(afterB);
  TestValidator.equals(
    "shipmentB orderItems count unchanged",
    afterB.orderItems.length,
    baseB.orderItems.length,
  );
  for (const oi of afterB.orderItems) {
    const before = baseBMap[oi.id];
    TestValidator.predicate(
      "shipmentB orderItem id exists in baseline",
      before !== undefined,
    );
    TestValidator.equals(
      "shipmentB orderItem line_item_status unchanged",
      oi.line_item_status,
      before,
    );
  }
}
