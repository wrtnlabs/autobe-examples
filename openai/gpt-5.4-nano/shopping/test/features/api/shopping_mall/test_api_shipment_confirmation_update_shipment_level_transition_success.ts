import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallShipmentConfirmation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentConfirmation";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_shipment_confirmation_update_shipment_level_transition_success(
  connection: api.IConnection
): Promise<void> {
  // 1) Authenticate as member (seller)
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_member_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(seller);

  // 2) Select an updatable shipmentConfirmationId.
  // NOTE: There is no provided SDK/utility to create or list shipment
  // confirmations in the given materials. This test assumes the backend
  // contains at least one seller-owned shipment confirmation.
  const shipmentConfirmationId = typia.random<string & tags.Format<"uuid">>();
  const confirmedAt = new Date().toISOString();

  const updateBody = {
    confirmation_type: typia.random<string>(),
    confirmed_at: confirmedAt,
    tracking_url: "https://example.com/tracking/" + RandomGenerator.alphaNumeric(8),
    tracking_number: RandomGenerator.alphaNumeric(12),
    carrier_name: RandomGenerator.name(2),
    note: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IShoppingMallShipmentConfirmation.IUpdate;

  // 3) Update seller shipment confirmation
  const updated = await api.functional.shoppingMall.member.shipment_confirmations.update(sellerConnection, {
    shipmentConfirmationId,
    body: updateBody,
  });
  typia.assert(updated);

  // 4) Validate persistence
  TestValidator.equals(
    "confirmation_type matches request",
    updated.confirmation_type,
    updateBody.confirmation_type
  );
  TestValidator.equals("confirmed_at matches request", updated.confirmed_at, updateBody.confirmed_at);
  TestValidator.equals("tracking_url persisted", updated.tracking_url, updateBody.tracking_url);
  TestValidator.equals("tracking_number persisted", updated.tracking_number, updateBody.tracking_number);
  TestValidator.equals("carrier_name persisted", updated.carrier_name, updateBody.carrier_name);
  TestValidator.equals("note persisted", updated.note, updateBody.note);

  // 6) Idempotency / repeated update check (best-effort)
  const updatedAgain = await api.functional.shoppingMall.member.shipment_confirmations.update(sellerConnection, {
    shipmentConfirmationId,
    body: updateBody,
  });
  typia.assert(updatedAgain);

  TestValidator.equals(
    "repeated update keeps confirmation_type",
    updatedAgain.confirmation_type,
    updateBody.confirmation_type
  );
  TestValidator.equals(
    "repeated update keeps confirmed_at",
    updatedAgain.confirmed_at,
    updateBody.confirmed_at
  );
}
