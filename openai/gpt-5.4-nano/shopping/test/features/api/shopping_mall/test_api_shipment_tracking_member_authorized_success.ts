import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_shipment_tracking_member_authorized_success(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth: IShoppingMallMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
      } satisfies IShoppingMallMember.IJoin,
    });
  typia.assert(memberAuth);
  memberConnection.headers ??= {};
  memberConnection.headers.Authorization = memberAuth.token.access;
  const shipmentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const tracking1: IShoppingMallShipment =
    await api.functional.shoppingMall.member.shipments.tracking.at(
      memberConnection,
      {
        shipmentId,
      },
    );
  typia.assert(tracking1);
  const tracking2: IShoppingMallShipment =
    await api.functional.shoppingMall.member.shipments.tracking.at(
      memberConnection,
      {
        shipmentId,
      },
    );
  typia.assert(tracking2);
  TestValidator.equals(
    "shipment tracking consistent (tracking object)",
    tracking1.tracking,
    tracking2.tracking,
  );
  // Even when tracking is present, DTO definition declares all fields as `null | null`,
  // so we only validate that the response structure is consistent.
  if (tracking1.tracking !== null && tracking2.tracking !== null) {
    TestValidator.equals(
      "confirmationType consistent",
      tracking1.tracking.confirmationType,
      tracking2.tracking.confirmationType,
    );
    TestValidator.equals(
      "confirmedAt consistent",
      tracking1.tracking.confirmedAt,
      tracking2.tracking.confirmedAt,
    );
    TestValidator.equals(
      "carrierName consistent",
      tracking1.tracking.carrierName,
      tracking2.tracking.carrierName,
    );
    TestValidator.equals(
      "trackingNumber consistent",
      tracking1.tracking.trackingNumber,
      tracking2.tracking.trackingNumber,
    );
    TestValidator.equals(
      "trackingUrl consistent",
      tracking1.tracking.trackingUrl,
      tracking2.tracking.trackingUrl,
    );
  }
}
