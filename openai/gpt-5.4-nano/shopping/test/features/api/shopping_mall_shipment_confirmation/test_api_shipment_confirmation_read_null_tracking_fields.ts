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

export async function test_api_shipment_confirmation_read_null_tracking_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as a member via join
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2) Attempt to read a shipment confirmation record by ID.
  // NOTE: The provided materials do not include any API/utility to create or
  // discover a shipment confirmation with null tracking fields. Therefore we
  // use a random UUID and validate the response contract if the record is
  // viewable.
  const shipmentConfirmationId = typia.random<string & tags.Format<"uuid">>();
  // 3) Read shipment confirmation
  const confirmation =
    await api.functional.shoppingMall.member.shipment_confirmations.at(
      memberConnection,
      { shipmentConfirmationId },
    );
  typia.assert(confirmation);
  // 4) Validate null tracking fields explicitly
  TestValidator.equals(
    "tracking_url should be null",
    confirmation.tracking_url,
    null,
  );
  TestValidator.equals(
    "tracking_number should be null",
    confirmation.tracking_number,
    null,
  );
  TestValidator.equals(
    "carrier_name should be null",
    confirmation.carrier_name,
    null,
  );
  // 5) Validate other mandatory fields are populated
  TestValidator.predicate("id should be non-empty", confirmation.id.length > 0);
  TestValidator.predicate(
    "shopping_mall_shipment_id should be non-empty",
    confirmation.shopping_mall_shipment_id.length > 0,
  );
  TestValidator.predicate(
    "confirmation_type should be non-empty",
    confirmation.confirmation_type.length > 0,
  );
  TestValidator.predicate(
    "confirmed_at should be non-empty",
    confirmation.confirmed_at.length > 0,
  );
  TestValidator.predicate(
    "created_at should be non-empty",
    confirmation.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at should be non-empty",
    confirmation.updated_at.length > 0,
  );
  // 6) Validate note is present and consistent
  TestValidator.predicate(
    "note is either null or non-empty",
    confirmation.note === null || confirmation.note.length > 0,
  );
}
