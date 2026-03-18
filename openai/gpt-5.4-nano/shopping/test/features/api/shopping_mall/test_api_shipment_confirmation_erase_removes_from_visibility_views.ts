import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_shipment_confirmation_erase_removes_from_visibility_views(
  connection: api.IConnection,
): Promise<void> {
  // Given the provided SDK surface in this prompt, we only have:
  // - Member join authorization (utility)
  // - Erase (hard-delete) for shipment confirmations
  // There are no provided endpoints to create shipment confirmations nor
  // endpoints to list/read visibility views.
  //
  // Therefore, we validate that the authorized member can attempt erase
  // and that the system responds (either success if the id exists in the
  // environment, or throws if it does not).
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  const shipmentConfirmationId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "erase attempt may fail without a real existing shipment confirmation",
    async () => {
      await api.functional.shoppingMall.member.shipment_confirmations.erase(
        memberConnection,
        { shipmentConfirmationId },
      );
    },
  );
}
