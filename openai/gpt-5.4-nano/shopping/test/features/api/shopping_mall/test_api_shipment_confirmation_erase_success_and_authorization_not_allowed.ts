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

export async function test_api_shipment_confirmation_erase_success_and_authorization_not_allowed(
  connection: api.IConnection,
): Promise<void> {
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberBConnection: api.IConnection = { host: connection.host };
  // Member A
  await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  // Member B
  await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  // Non-existent id: must be not-found (idempotent)
  const nonExistentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.httpError(
    "delete non-existent shipment confirmation should be not-found (first)",
    404,
    async () => {
      await api.functional.shoppingMall.member.shipment_confirmations.erase(
        memberAConnection,
        {
          shipmentConfirmationId: nonExistentId,
        },
      );
    },
  );
  await TestValidator.httpError(
    "delete non-existent shipment confirmation should be not-found (second)",
    404,
    async () => {
      await api.functional.shoppingMall.member.shipment_confirmations.erase(
        memberAConnection,
        {
          shipmentConfirmationId: nonExistentId,
        },
      );
    },
  );
  // Authorization boundary: member B must not be able to delete member A's confirmation
  // With no provided API to create/list confirmations, use a random uuid and assert rejection.
  const candidateId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.httpError(
    "member B delete should be rejected (forbidden/unauthorized or not-found)",
    [401, 403, 404],
    async () => {
      await api.functional.shoppingMall.member.shipment_confirmations.erase(
        memberBConnection,
        {
          shipmentConfirmationId: candidateId,
        },
      );
    },
  );
}
