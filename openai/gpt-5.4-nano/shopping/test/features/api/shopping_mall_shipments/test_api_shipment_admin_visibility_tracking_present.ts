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
import { generate_random_shopping_mall_member_shipments_confirmations_create } from "../../../generate/generate_random_shopping_mall_member_shipments_confirmations_create";
import { generate_random_shopping_mall_member_shipments_create } from "../../../generate/generate_random_shopping_mall_member_shipments_create";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";
import { prepare_random_shopping_mall_shipment_confirmation } from "../../../prepare/prepare_random_shopping_mall_shipment_confirmation";

export async function test_api_shipment_admin_visibility_tracking_present(
  connection: api.IConnection,
): Promise<void> {
  // 1) Register & login admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "Password123!" satisfies string &
    tags.Format<"password">;
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

  // 2) Register & login member (seller)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "Password123!" satisfies string &
    tags.Format<"password">;
  await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IShoppingMallMember.IJoin,
  });
  await authorize_member_login(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IShoppingMallMember.ILogin,
  });

  // 3) Create shipment grouping (helper ensures valid order/items)
  const shipment = await generate_random_shopping_mall_member_shipments_create(
    memberConnection,
    {
      body: {} as any,
    },
  );
  typia.assert(shipment);

  // 4) Submit seller shipment confirmation with tracking
  const confirmation =
    await generate_random_shopping_mall_member_shipments_confirmations_create(
      memberConnection,
      {
        params: { shipmentId: shipment.id },
        body: {
          shoppingMallShipmentId: shipment.id,
          confirmationType: "shipped",
          confirmedAt: new Date().toISOString(),
          trackingUrl: typia.random<string & tags.Format<"url">>(),
          trackingNumber: typia.random<string>(),
          carrierName: typia.random<string>(),
          note: typia.random<string>(),
        } satisfies IShoppingMallShipmentConfirmation.ICreate,
      },
    );
  typia.assert(confirmation);

  // 5) Admin read
  const adminRead = await api.functional.shoppingMall.admin.admin.shipments.at(
    adminConnection,
    {
      shipmentId: shipment.id,
    },
  );
  typia.assert(adminRead);

  TestValidator.predicate(
    "tracking exists",
    adminRead.tracking !== null &&
      adminRead.tracking.confirmationType !== null &&
      adminRead.tracking.confirmedAt !== null,
  );

  TestValidator.equals(
    "confirmationType matches",
    adminRead.tracking!.confirmationType,
    confirmation.confirmation_type as any,
  );
  TestValidator.equals(
    "confirmedAt matches",
    adminRead.tracking!.confirmedAt,
    confirmation.confirmed_at as any,
  );
  TestValidator.equals(
    "trackingUrl matches",
    adminRead.tracking!.trackingUrl,
    (confirmation.tracking_url ?? undefined) as any,
  );
  TestValidator.equals(
    "trackingNumber matches",
    adminRead.tracking!.trackingNumber,
    (confirmation.tracking_number ?? undefined) as any,
  );
  TestValidator.equals(
    "carrierName matches",
    adminRead.tracking!.carrierName,
    (confirmation.carrier_name ?? undefined) as any,
  );
  TestValidator.equals(
    "note matches",
    adminRead.tracking!.note,
    (confirmation.note ?? undefined) as any,
  );

  TestValidator.predicate(
    "orderItems correlated",
    adminRead.orderItems.length >= 1 &&
      adminRead.orderItems.every(
        (item) => item.shopping_mall_shipment_id === adminRead.id,
      ) &&
      adminRead.orderItems.some((item) => item.line_item_status.length >= 0),
  );
}
