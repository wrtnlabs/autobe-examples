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

export async function test_api_shipment_confirmation_read_own_record_success(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member authorization (join)
  const memberConnection: api.IConnection = { host: connection.host };
  const joinOutput = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(joinOutput);
  // authorize_member_join updates memberConnection.headers.Authorization internally
  // 2) Use fixture-provided shipmentConfirmationId from the test runtime context
  const rawFixture = (
    globalThis as unknown as {
      shipmentConfirmationId?: unknown;
    }
  ).shipmentConfirmationId;
  if (rawFixture === undefined) {
    throw new Error(
      "Missing fixture shipmentConfirmationId for this test environment.",
    );
  }
  const shipmentConfirmationId = typia.assert<string & tags.Format<"uuid">>(
    rawFixture,
  );
  // 3) Read shipment confirmation
  const read1 =
    await api.functional.shoppingMall.member.shipment_confirmations.at(
      memberConnection,
      {
        shipmentConfirmationId,
      },
    );
  typia.assert(read1);
  // 4) Repeated reads consistency checks
  const read2 =
    await api.functional.shoppingMall.member.shipment_confirmations.at(
      memberConnection,
      {
        shipmentConfirmationId,
      },
    );
  typia.assert(read2);
  TestValidator.equals(
    "confirmation_type stable across repeated reads",
    read2.confirmation_type,
    read1.confirmation_type,
  );
  TestValidator.equals(
    "confirmed_at stable across repeated reads",
    read2.confirmed_at,
    read1.confirmed_at,
  );
  // 5) Authorization/business check: record must correspond to the requested confirmation
  TestValidator.equals(
    "id matches requested",
    read1.id,
    shipmentConfirmationId,
  );
}
