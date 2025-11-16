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

export async function test_api_seller_payout_update_financial_amounts(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform admin so that protected payout APIs can be used.
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(12),
    ip: undefined,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/login",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create a guest cart to simulate upstream shopping activity context.
  const guestCartBody = {
    guest_token: RandomGenerator.alphaNumeric(16),
    ip: "203.0.113.10",
    user_agent: "E2E-Test-Agent/1.0",
    referrer: "https://shop.example.com/landing",
    region_code: "US",
  } satisfies IShoppingMallGuestCart.ICreate;

  const guestCart: IShoppingMallGuestCart =
    await api.functional.shoppingMall.guestCarts.create(connection, {
      body: guestCartBody,
    });
  typia.assert(guestCart);

  // 3. Prepare seller payout creation request with consistent financial amounts.
  const sellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const initialGross = 10_000;
  const initialFee = 1_000;
  const initialAdjustment = 500;
  const initialNet = initialGross - initialFee + initialAdjustment;

  const now = new Date();
  const periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1_000);
  const periodEnd = now;

  const scheduledAt = RandomGenerator.date(
    new Date(now.getTime() + 24 * 60 * 60 * 1_000),
    7 * 24 * 60 * 60 * 1_000,
  );

  const payoutCreateBody = {
    seller_id: sellerId,
    currency_code: "USD",
    gross_amount: initialGross,
    fee_amount: initialFee,
    adjustment_amount: initialAdjustment,
    net_amount: initialNet,
    period_start: periodStart.toISOString(),
    period_end: periodEnd.toISOString(),
    payout_status: "payout_pending",
    scheduled_payout_at: scheduledAt.toISOString(),
    memo: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallSellerPayout.ICreate;

  const created: IShoppingMallSellerPayout =
    await api.functional.shoppingMall.platformAdmin.sellerPayouts.create(
      connection,
      {
        body: payoutCreateBody,
      },
    );
  typia.assert(created);

  // Keep original immutable and reference fields for later comparison.
  const originalId = created.id;
  const originalSellerId = created.sellerId;
  const originalCurrency = created.currency;
  const originalPayoutCode = created.payoutCode;
  const originalCreatedAt = created.createdAt;
  const originalUpdatedAt = created.updatedAt;

  // 4. Construct update payload to adjust monetary fields and memo.
  const updatedGross = initialGross + 2_000;
  const updatedFee = initialFee + 300;
  const updatedAdjustment = initialAdjustment - 200;
  const updatedNet = updatedGross - updatedFee + updatedAdjustment;

  // Business rule: ensure non-negative net amount before sending.
  await TestValidator.predicate(
    "updated netAmount must be non-negative",
    () => updatedNet >= 0,
  );

  const updateBody = {
    gross_amount: updatedGross,
    fee_amount: updatedFee,
    adjustment_amount: updatedAdjustment,
    net_amount: updatedNet,
    memo: `${payoutCreateBody.memo ?? ""} (adjusted in E2E test)`,
  } satisfies IShoppingMallSellerPayout.IUpdate;

  const updated: IShoppingMallSellerPayout =
    await api.functional.shoppingMall.platformAdmin.sellerPayouts.update(
      connection,
      {
        sellerPayoutId: originalId as string & tags.Format<"uuid">,
        body: updateBody,
      },
    );
  typia.assert(updated);

  // 5. Validate monetary fields reflect the update payload.
  TestValidator.equals(
    "grossAmount updated",
    updated.grossAmount,
    updatedGross,
  );

  if (updated.feeAmount !== null && updated.feeAmount !== undefined) {
    TestValidator.equals("feeAmount updated", updated.feeAmount, updatedFee);
  }

  if (
    updated.adjustmentAmount !== null &&
    updated.adjustmentAmount !== undefined
  ) {
    TestValidator.equals(
      "adjustmentAmount updated",
      updated.adjustmentAmount,
      updatedAdjustment,
    );
  }

  TestValidator.equals("netAmount updated", updated.netAmount, updatedNet);

  // 6. Validate immutable fields remain unchanged.
  TestValidator.equals(
    "sellerId immutable",
    updated.sellerId,
    originalSellerId,
  );
  TestValidator.equals(
    "currency immutable",
    updated.currency,
    originalCurrency,
  );
  TestValidator.equals(
    "payoutCode immutable",
    updated.payoutCode,
    originalPayoutCode,
  );

  // 7. Validate createdAt unchanged and updatedAt advanced.
  TestValidator.equals(
    "createdAt unchanged",
    updated.createdAt,
    originalCreatedAt,
  );

  await TestValidator.predicate("updatedAt advanced", () => {
    const before = Date.parse(originalUpdatedAt);
    const after = Date.parse(updated.updatedAt);
    return after > before;
  });

  // 8. Recompute expected net amount from updated response itself
  //    to ensure consistency with platform business rule.
  const feeFromResponse = updated.feeAmount ?? 0;
  const adjustmentFromResponse = updated.adjustmentAmount ?? 0;
  const recomputedNet =
    updated.grossAmount - feeFromResponse + adjustmentFromResponse;

  TestValidator.equals(
    "netAmount formula consistency",
    updated.netAmount,
    recomputedNet,
  );

  await TestValidator.predicate(
    "netAmount non-negative after update",
    () => updated.netAmount >= 0,
  );
}
