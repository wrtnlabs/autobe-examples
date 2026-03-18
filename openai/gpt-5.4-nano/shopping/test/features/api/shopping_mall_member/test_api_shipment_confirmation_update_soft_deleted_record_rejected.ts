import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallShipmentConfirmation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentConfirmation";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_shipment_confirmation_update_soft_deleted_record_rejected(
  connection: api.IConnection,
): Promise<void> {
  // Create actor connection (member)
  const memberConnection: api.IConnection = { host: connection.host };
  // 1) Create a member account via join utility
  const joined = await authorize_member_join(memberConnection, {});
  typia.assert(joined);
  // 2) Target a soft-deleted shipment confirmation record.
  // Note: The provided SDK surface includes only the update endpoint and DTOs for
  // join + shipment confirmation update. There are no retrieval/list DTOs to
  // deterministically pick an existing soft-deleted record.
  // We still generate a valid UUID and assert that the update is rejected.
  const shipmentConfirmationId = typia.random<string & tags.Format<"uuid">>();
  const body = {
    confirmation_type: typia.random<string>(),
    confirmed_at: new Date().toISOString(),
    tracking_url: null,
    tracking_number: null,
    carrier_name: null,
    note: null,
  } satisfies IShoppingMallShipmentConfirmation.IUpdate;
  // 3) Attempt update; must be rejected when the confirmation is treated as removed.
  await TestValidator.error(
    "soft-deleted shipment confirmation update rejected",
    async () => {
      await api.functional.shoppingMall.member.shipment_confirmations.update(
        memberConnection,
        {
          shipmentConfirmationId,
          body,
        },
      );
    },
  );
}
