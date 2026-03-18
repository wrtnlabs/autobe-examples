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
import { generate_random_shopping_mall_member_payments_create } from "../../../generate/generate_random_shopping_mall_member_payments_create";
import { prepare_random_shopping_mall_payment } from "../../../prepare/prepare_random_shopping_mall_payment";

export async function test_api_member_payment_fetch_failed_payment_diagnostics(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate a member via join utility
  const memberConnection: api.IConnection = { host: connection.host };
  const _authorized: IShoppingMallMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IShoppingMallMember.IJoin,
    });
  // 2) Initiate a member payment attempt that results in a failed payment attempt.
  // Retry until we get a record that looks like a failed attempt.
  let payment: IShoppingMallPayment | undefined;
  for (let attempt = 0; attempt < 5; attempt++) {
    const created = await generate_random_shopping_mall_member_payments_create(
      memberConnection,
      {
        body: {
          amount: typia.random<
            number & tags.Minimum<1> & tags.Maximum<100000>
          >(),
          currency: "USD",
          provider: RandomGenerator.alphaNumeric(8),
          provider_reference: `fail_${RandomGenerator.alphaNumeric(12)}`,
          orderPlacementContextId: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IShoppingMallPayment.ICreate,
      },
    );
    typia.assert(created);
    const looksFailed =
      created.paid_at === null &&
      (created.error_code !== null || created.error_message !== null);
    if (looksFailed) {
      payment = created;
      break;
    }
  }
  if (!payment) {
    throw new Error("Failed to create a failed payment attempt");
  }
  const paymentId = payment.id;
  // 3) Call GET /shoppingMall/member/payments/{paymentId}
  const fetched1: IShoppingMallPayment =
    await api.functional.shoppingMall.member.payments.at(memberConnection, {
      paymentId,
    });
  typia.assert(fetched1);
  // 4) Validate failure diagnostics consistency
  TestValidator.equals("paid_at should be null", fetched1.paid_at, null);
  TestValidator.equals("id should remain same", fetched1.id, payment.id);
  TestValidator.equals("status should match", fetched1.status, payment.status);
  // paid_at is null => failure diagnostics should be present or partially present.
  if (fetched1.error_code !== null) {
    TestValidator.predicate(
      "error_code non-empty",
      fetched1.error_code.length > 0,
    );
  }
  if (fetched1.error_message !== null) {
    TestValidator.predicate(
      "error_message non-empty",
      fetched1.error_message.length > 0,
    );
  }
  // 5) Validate no side effects on re-fetch
  const fetched2: IShoppingMallPayment =
    await api.functional.shoppingMall.member.payments.at(memberConnection, {
      paymentId,
    });
  typia.assert(fetched2);
  TestValidator.equals("paid_at stable", fetched2.paid_at, fetched1.paid_at);
  TestValidator.equals(
    "error_code stable",
    fetched2.error_code,
    fetched1.error_code,
  );
  TestValidator.equals(
    "error_message stable",
    fetched2.error_message,
    fetched1.error_message,
  );
  TestValidator.equals("status stable", fetched2.status, fetched1.status);
  // Immutable identity/amount/provider fields should remain consistent
  TestValidator.equals("amount stable", fetched2.amount, fetched1.amount);
  TestValidator.equals("currency stable", fetched2.currency, fetched1.currency);
  TestValidator.equals("provider stable", fetched2.provider, fetched1.provider);
  TestValidator.equals(
    "provider_reference stable",
    fetched2.provider_reference,
    fetched1.provider_reference,
  );
  TestValidator.equals(
    "created_at stable",
    fetched2.created_at,
    fetched1.created_at,
  );
  // updated_at should be same or later
  TestValidator.predicate(
    "updated_at should not go backwards",
    new Date(fetched2.updated_at).getTime() >=
      new Date(fetched1.updated_at).getTime(),
  );
}
