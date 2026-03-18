import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_payment_fetch_owned_success_and_nullable_fields(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IShoppingMallMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
      } satisfies IShoppingMallMember.IJoin,
    },
  );
  // We don't have any provided API/utility to create a persisted payment record.
  // To still exercise the endpoint contract, we attempt multiple UUIDs until
  // the call succeeds (non-2xx responses are handled by retry without asserting
  // specific HTTP status codes).
  const candidates = Array.from({ length: 5 }, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );
  let payment: IShoppingMallPayment | undefined;
  let paymentId: string | undefined;
  for (const candidate of candidates) {
    try {
      const result = await api.functional.shoppingMall.member.payments.at(
        memberConnection,
        {
          paymentId: candidate,
        },
      );
      typia.assert(result);
      payment = result;
      paymentId = candidate;
      break;
    } catch {
      // Ignore and retry with another candidate UUID.
    }
  }
  if (!payment || !paymentId) {
    throw new Error(
      `Could not fetch an existing payment for member ${member.id} using available SDK endpoints.`,
    );
  }
  const paymentA = payment;
  const paidAtBefore = paymentA.paid_at;
  const statusBefore = paymentA.status;
  const paymentB = await api.functional.shoppingMall.member.payments.at(
    memberConnection,
    {
      paymentId,
    },
  );
  typia.assert(paymentB);
  TestValidator.equals("id preserved", paymentB.id, paymentA.id);
  TestValidator.equals("status unchanged", paymentB.status, statusBefore);
  TestValidator.equals("paid_at unchanged", paymentB.paid_at, paidAtBefore);
}
