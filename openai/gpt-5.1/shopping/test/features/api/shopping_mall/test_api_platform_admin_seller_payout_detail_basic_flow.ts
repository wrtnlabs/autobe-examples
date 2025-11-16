import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallGuestCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestCart";
import type { IShoppingMallGuestCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestCartItem";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerPayout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPayout";

export async function test_api_platform_admin_seller_payout_detail_basic_flow(
  connection: api.IConnection,
) {
  // 1. Register a platform admin and obtain an authorized session
  const adminJoinBody = typia.random<IShoppingMallPlatformAdminJoin.IRequest>();
  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. As this admin, create a guest cart to simulate upstream activity
  const guestCartBody = typia.random<IShoppingMallGuestCart.ICreate>();
  const guestCart: IShoppingMallGuestCart =
    await api.functional.shoppingMall.guestCarts.create(connection, {
      body: guestCartBody,
    });
  typia.assert<IShoppingMallGuestCart>(guestCart);

  // 3. Create a concrete seller payout batch
  const sellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const grossAmount = 1000;
  const feeAmount = 50;
  const adjustmentAmount = -10;
  const netAmount = grossAmount - feeAmount + adjustmentAmount;

  const periodStart = typia.random<string & tags.Format<"date-time">>();
  const periodEnd = typia.random<string & tags.Format<"date-time">>();
  const scheduledPayoutAt = typia.random<string & tags.Format<"date-time">>();

  const createBody = {
    seller_id: sellerId,
    currency_code: "USD",
    gross_amount: grossAmount,
    fee_amount: feeAmount,
    adjustment_amount: adjustmentAmount,
    net_amount: netAmount,
    period_start: periodStart,
    period_end: periodEnd,
    payout_status: "payout_pending",
    scheduled_payout_at: scheduledPayoutAt,
    memo: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallSellerPayout.ICreate;

  const created: IShoppingMallSellerPayout =
    await api.functional.shoppingMall.platformAdmin.sellerPayouts.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert<IShoppingMallSellerPayout>(created);

  // 4. Retrieve payout details by id
  const detail: IShoppingMallSellerPayout =
    await api.functional.shoppingMall.platformAdmin.sellerPayouts.at(
      connection,
      {
        sellerPayoutId: created.id,
      },
    );
  typia.assert<IShoppingMallSellerPayout>(detail);

  // 5. Validate that the retrieved payout matches the created payout
  TestValidator.equals("payout id should match", detail.id, created.id);

  TestValidator.equals(
    "seller id should match",
    detail.sellerId,
    created.sellerId,
  );

  // If seller summary is present, its id must match sellerId
  if (detail.seller) {
    TestValidator.equals(
      "seller summary id should match sellerId",
      detail.seller.id,
      detail.sellerId,
    );
  }

  // Monetary fields
  TestValidator.equals(
    "currency in detail should match request currency_code",
    detail.currency,
    createBody.currency_code,
  );

  TestValidator.equals(
    "gross amount should match",
    detail.grossAmount,
    createBody.gross_amount,
  );

  TestValidator.equals(
    "fee amount should match",
    detail.feeAmount ?? null,
    createBody.fee_amount ?? null,
  );

  TestValidator.equals(
    "adjustment amount should match",
    detail.adjustmentAmount ?? null,
    createBody.adjustment_amount ?? null,
  );

  TestValidator.equals(
    "net amount should match",
    detail.netAmount,
    createBody.net_amount,
  );

  // Period boundaries
  TestValidator.equals(
    "periodStart should match",
    detail.periodStart ?? null,
    createBody.period_start ?? null,
  );

  TestValidator.equals(
    "periodEnd should match",
    detail.periodEnd ?? null,
    createBody.period_end ?? null,
  );

  // Payout status
  TestValidator.equals(
    "payoutStatus should match",
    detail.payoutStatus,
    createBody.payout_status ?? created.payoutStatus,
  );

  // Provider and failure information should be consistent between created and detail
  TestValidator.equals(
    "providerName consistency",
    detail.providerName ?? null,
    created.providerName ?? null,
  );

  TestValidator.equals(
    "providerPayoutId consistency",
    detail.providerPayoutId ?? null,
    created.providerPayoutId ?? null,
  );

  TestValidator.equals(
    "failureReasonCode consistency",
    detail.failureReasonCode ?? null,
    created.failureReasonCode ?? null,
  );

  TestValidator.equals(
    "failureReasonMessage consistency",
    detail.failureReasonMessage ?? null,
    created.failureReasonMessage ?? null,
  );

  // Sanity: ensure we did not accidentally retrieve a completely unrelated payout
  TestValidator.equals(
    "net amount of detail should equal created net amount",
    detail.netAmount,
    created.netAmount,
  );
}
