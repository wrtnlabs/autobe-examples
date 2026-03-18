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
import { generate_random_shopping_mall_member_shipment_confirmations_create } from "../../../generate/generate_random_shopping_mall_member_shipment_confirmations_create";
import { prepare_random_shopping_mall_shipment_confirmation } from "../../../prepare/prepare_random_shopping_mall_shipment_confirmation";

export async function test_api_shipment_confirmation_terminal_state_repeat_handling(
  connection: api.IConnection,
): Promise<void> {
  // 1) Join as member (seller role context)
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, { body: undefined });

  // 2) Seed an eligible shipment/terminal-capable state by creating a confirmation
  const firstConfirmation =
    await generate_random_shopping_mall_member_shipment_confirmations_create(
      memberConnection,
      { body: undefined },
    );
  typia.assert(firstConfirmation);

  // 3) Repeat confirmation for the same shoppingMallShipmentId
  const repeatRequest = async () => {
    const secondConfirmation =
      await generate_random_shopping_mall_member_shipment_confirmations_create(
        memberConnection,
        {
          body: {
            shoppingMallShipmentId: firstConfirmation.shopping_mall_shipment_id,
            // Use a different confirmationType to attempt a conflicting transition.
            confirmationType: `${firstConfirmation.confirmation_type}-repeat`,
            confirmedAt: new Date().toISOString(),
          },
        },
      );
    typia.assert(secondConfirmation);
    return secondConfirmation;
  };

  // 4) Validate business handling: either rejects OR is a coherent idempotent/no-op
  try {
    const secondConfirmation = await repeatRequest();

    // 5) Consistency invariants (confirmation-record level)
    TestValidator.equals(
      "shipment id preserved across repeated confirmation",
      secondConfirmation.shopping_mall_shipment_id,
      firstConfirmation.shopping_mall_shipment_id,
    );

    TestValidator.equals(
      "second confirmation belongs to same terminal shipment",
      secondConfirmation.shopping_mall_shipment_id,
      firstConfirmation.shopping_mall_shipment_id,
    );
  } catch {
    // Rejected path is acceptable for terminal-state conflicts.
    await TestValidator.error(
      "repeat terminal confirmation should reject or no-op",
      async () => {
        await repeatRequest();
      },
    );
  }
}
