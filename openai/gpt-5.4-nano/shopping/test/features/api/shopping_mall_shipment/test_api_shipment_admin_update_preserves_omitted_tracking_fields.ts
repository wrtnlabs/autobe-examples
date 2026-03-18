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

export async function test_api_shipment_admin_update_preserves_omitted_tracking_fields(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const memberConnection: api.IConnection = { host: connection.host };
  // Prepare admin (join + login) and member (join)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.ILogin,
  });
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallMember.IJoin,
  });
  const shipment = await generate_random_shopping_mall_member_shipments_create(
    memberConnection,
    {},
  );
  typia.assert(shipment);
  const shipmentId: string = shipment.id;
  const originalTracking = shipment.tracking;
  // 1st update: change shipment status & confirmation fields; omit tracking fields
  const nextStatus1 = RandomGenerator.alphabets(10);
  const confirmationType1 = RandomGenerator.alphabets(12);
  const confirmedAt1 = new Date().toISOString();
  const updated1 =
    await api.functional.shoppingMall.admin.admin.shipments.update(
      adminConnection,
      {
        shipmentId,
        body: {
          status: nextStatus1,
          confirmation_type: confirmationType1,
          confirmed_at: confirmedAt1,
          // omit: tracking_url, tracking_number, carrier_name, note
        } satisfies IShoppingMallShipment.IUpdate,
      },
    );
  typia.assert(updated1);
  TestValidator.equals("shipment.id unchanged", updated1.id, shipmentId);
  TestValidator.equals("shipment.status updated", updated1.status, nextStatus1);
  // DTO contract: tracking fields are typed to null (always null).
  // Therefore omission/preservation should manifest as: tracking remains null (or tracking exists but sub-fields are null).
  if (originalTracking === null) {
    TestValidator.equals(
      "tracking remains null after omission",
      updated1.tracking,
      null,
    );
  } else {
    TestValidator.notEquals(
      "tracking object should still exist (or remain consistent)",
      updated1.tracking,
      undefined,
    );
    if (updated1.tracking !== null) {
      TestValidator.equals(
        "tracking.confirmationType is null",
        updated1.tracking.confirmationType,
        null,
      );
      TestValidator.equals(
        "tracking.confirmedAt is null",
        updated1.tracking.confirmedAt,
        null,
      );
      TestValidator.equals(
        "tracking.trackingUrl preserved (null contract)",
        updated1.tracking.trackingUrl,
        originalTracking.trackingUrl,
      );
      TestValidator.equals(
        "tracking.trackingNumber preserved (null contract)",
        updated1.tracking.trackingNumber,
        originalTracking.trackingNumber,
      );
      TestValidator.equals(
        "tracking.carrierName preserved (null contract)",
        updated1.tracking.carrierName,
        originalTracking.carrierName,
      );
      TestValidator.equals(
        "tracking.note preserved (null contract)",
        updated1.tracking.note,
        originalTracking.note,
      );
    }
  }
  // 2nd update: keep status same, provide tracking_url & tracking_number only
  const trackingUrl2 = `https://tracking.example/${RandomGenerator.alphaNumeric(8)}`;
  const trackingNumber2 = RandomGenerator.alphaNumeric(14);
  const updated2 =
    await api.functional.shoppingMall.admin.admin.shipments.update(
      adminConnection,
      {
        shipmentId,
        body: {
          status: nextStatus1,
          tracking_url: trackingUrl2,
          tracking_number: trackingNumber2,
          // omit confirmation_type, confirmed_at, carrier_name, note
        } satisfies IShoppingMallShipment.IUpdate,
      },
    );
  typia.assert(updated2);
  TestValidator.equals(
    "shipment.status unchanged on tracking-only update",
    updated2.status,
    nextStatus1,
  );
  if (updated1.tracking === null) {
    TestValidator.equals(
      "tracking stays null when there was none",
      updated2.tracking,
      null,
    );
  } else {
    if (updated2.tracking !== null) {
      TestValidator.equals(
        "tracking.confirmationType remains null",
        updated2.tracking.confirmationType,
        null,
      );
      TestValidator.equals(
        "tracking.confirmedAt remains null",
        updated2.tracking.confirmedAt,
        null,
      );
      // Since tracking sub-fields are null-typed, they must remain null despite providing values.
      TestValidator.equals(
        "tracking.trackingUrl remains null (typed contract)",
        updated2.tracking.trackingUrl,
        null,
      );
      TestValidator.equals(
        "tracking.trackingNumber remains null (typed contract)",
        updated2.tracking.trackingNumber,
        null,
      );
      TestValidator.equals(
        "tracking.carrierName remains null (typed contract)",
        updated2.tracking.carrierName,
        null,
      );
      TestValidator.equals(
        "tracking.note remains null (typed contract)",
        updated2.tracking.note,
        null,
      );
    }
  }
}
