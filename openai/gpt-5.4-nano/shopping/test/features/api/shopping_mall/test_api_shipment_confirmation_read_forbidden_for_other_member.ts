import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_shopping_mall_member_shipments_confirmations_create } from "../../../generate/generate_random_shopping_mall_member_shipments_confirmations_create";
import { generate_random_shopping_mall_member_shipments_create } from "../../../generate/generate_random_shopping_mall_member_shipments_create";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";
import { prepare_random_shopping_mall_shipment_confirmation } from "../../../prepare/prepare_random_shopping_mall_shipment_confirmation";

export async function test_api_shipment_confirmation_read_forbidden_for_other_member(
  connection: api.IConnection,
): Promise<void> {
  // 1) memberA + memberB identities
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // 2) memberA creates shipment then submits a shipment confirmation
  const memberAShipment =
    await generate_random_shopping_mall_member_shipments_create(
      memberAConnection,
      {},
    );
  typia.assert(memberAShipment);
  const memberAShipmentConfirmation =
    await generate_random_shopping_mall_member_shipments_confirmations_create(
      memberAConnection,
      {
        params: {
          shipmentId: memberAShipment.id,
        },
      },
    );
  typia.assert(memberAShipmentConfirmation);
  const shipmentConfirmationId = memberAShipmentConfirmation.id;
  // 3) memberB cannot read memberA's shipment confirmation
  await TestValidator.httpError(
    "memberB should not access memberA shipment confirmation",
    [403, 404],
    async () =>
      await api.functional.shoppingMall.member.shipment_confirmations.at(
        memberBConnection,
        {
          shipmentConfirmationId,
        },
      ),
  );
  // 4) sanity check: memberA can read
  const readBack =
    await api.functional.shoppingMall.member.shipment_confirmations.at(
      memberAConnection,
      {
        shipmentConfirmationId,
      },
    );
  typia.assert(readBack);
  TestValidator.equals(
    "confirmation id matches",
    readBack.id,
    shipmentConfirmationId,
  );
}
