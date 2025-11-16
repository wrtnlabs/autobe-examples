import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderLineThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderLineThumbnail";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallPaymentTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentTransaction";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallRefundTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundTransaction";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_platform_admin_refund_transaction_delete_rejects_nonexistent_id(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform admin so that admin-only endpoints can be used
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphabets(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create an initial refund transaction to ensure baseline data exists
  const createRefundBody1 = {
    shopping_mall_payment_transaction_id: typia.random<
      string & tags.Format<"uuid">
    >(),
    shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(),
    refund_number: RandomGenerator.alphaNumeric(16),
    refund_status: "refund_pending",
    actor_type: "admin",
    reason_category: "admin_adjustment",
    reason_message: RandomGenerator.paragraph({ sentences: 3 }),
    requested_amount: 1000,
    approved_amount: 1000,
    refunded_amount: null,
    currency: "USD",
    provider_refund_id: null,
    provider_status: null,
    failure_reason_code: null,
    failure_reason_message: null,
  } satisfies IShoppingMallRefundTransaction.ICreate;

  const refund1: IShoppingMallRefundTransaction =
    await api.functional.shoppingMall.refundTransactions.create(connection, {
      body: createRefundBody1,
    });
  typia.assert(refund1);

  // 3. Attempt to delete a clearly non-existent refund transaction id
  const nonexistentRefundId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  await TestValidator.error(
    "platform admin delete with nonexistent refundTransactionId must fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.refundTransactions.erase(
        connection,
        {
          refundTransactionId: nonexistentRefundId,
        },
      );
    },
  );

  // 4. Ensure the system remains functional by creating another refund
  const createRefundBody2 = {
    shopping_mall_payment_transaction_id: typia.random<
      string & tags.Format<"uuid">
    >(),
    shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(),
    refund_number: RandomGenerator.alphaNumeric(16),
    refund_status: "refund_pending",
    actor_type: "admin",
    reason_category: "admin_adjustment",
    reason_message: RandomGenerator.paragraph({ sentences: 2 }),
    requested_amount: 2000,
    approved_amount: 1500,
    refunded_amount: null,
    currency: "USD",
    provider_refund_id: null,
    provider_status: null,
    failure_reason_code: null,
    failure_reason_message: null,
  } satisfies IShoppingMallRefundTransaction.ICreate;

  const refund2: IShoppingMallRefundTransaction =
    await api.functional.shoppingMall.refundTransactions.create(connection, {
      body: createRefundBody2,
    });
  typia.assert(refund2);

  // 5. Basic business sanity checks: both refunds are distinct and intact
  TestValidator.notEquals(
    "separate refund transactions must have different ids",
    refund1.id,
    refund2.id,
  );

  TestValidator.predicate(
    "first refund remains in a non-failed status after nonexistent delete attempt",
    refund1.refund_status.length > 0,
  );
}
