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

/**
 * Validate updating a seller payout batch status from pending to sent by a
 * platform admin and recording execution-related metadata.
 *
 * Business context:
 *
 * - Platform admins manage seller payout batches and must be able to transition
 *   payouts from an initial pending-like state to a sent/completed state when
 *   funds have been remitted.
 * - The update operation must preserve immutable identifiers (payout id and
 *   seller association) while allowing lifecycle status and metadata (execution
 *   time hint, provider reference, memo) to change.
 *
 * Steps:
 *
 * 1. Join as a platform admin to obtain an authenticated context.
 * 2. Create a guest cart to simulate upstream commerce activity (no direct
 *    coupling but ensures realistic environment usage).
 * 3. Create a seller payout batch in a pending-like state.
 * 4. Update that payout to a sent/completed state with execution metadata via PUT
 *    /shoppingMall/platformAdmin/sellerPayouts/{id}.
 * 5. Assert that immutable fields are preserved and status/provider metadata
 *    reflect the update request.
 */
export async function test_api_seller_payout_update_status_to_sent(
  connection: api.IConnection,
) {
  // 1. Join as platform admin (auth & token handling done by SDK)
  const joinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphabets(12),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/login",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Create a guest cart for upstream context
  const guestCartBody = {
    guest_token: RandomGenerator.alphaNumeric(16),
    ip: "127.0.0.1",
    user_agent: "Mozilla/5.0 (E2E Test)",
    referrer: "https://shop.example.com/landing",
    region_code: "KR",
  } satisfies IShoppingMallGuestCart.ICreate;

  const guestCart: IShoppingMallGuestCart =
    await api.functional.shoppingMall.guestCarts.create(connection, {
      body: guestCartBody,
    });
  typia.assert<IShoppingMallGuestCart>(guestCart);

  // 3. Create a pending seller payout batch
  const sellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const grossAmount = 100000;
  const feeAmount = 5000;
  const adjustmentAmount = -2000;
  const netAmount = grossAmount - feeAmount + adjustmentAmount;

  const now = new Date();
  const scheduled = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
  const periodStart = new Date(
    now.getTime() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const periodEnd = now.toISOString();

  const createBody = {
    seller_id: sellerId,
    currency_code: "KRW",
    gross_amount: grossAmount,
    fee_amount: feeAmount,
    adjustment_amount: adjustmentAmount,
    net_amount: netAmount,
    period_start: periodStart,
    period_end: periodEnd,
    payout_status: "payout_pending",
    scheduled_payout_at: scheduled,
    memo: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IShoppingMallSellerPayout.ICreate;

  const created: IShoppingMallSellerPayout =
    await api.functional.shoppingMall.platformAdmin.sellerPayouts.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert<IShoppingMallSellerPayout>(created);

  const originalId = created.id;
  const originalSellerId = created.sellerId;
  const originalStatus = created.payoutStatus;
  const originalUpdatedAt = created.updatedAt;

  // 4. Update payout to sent/completed with execution-related metadata
  const executedAt = new Date().toISOString();
  const providerName = "TestBank";
  const providerPayoutId = RandomGenerator.alphaNumeric(24);
  const updateMemo = RandomGenerator.paragraph({ sentences: 3 });

  const updateBody = {
    payout_status: "payout_sent",
    executed_at: executedAt,
    provider_name: providerName,
    provider_payout_id: providerPayoutId,
    memo: updateMemo,
  } satisfies IShoppingMallSellerPayout.IUpdate;

  const updated: IShoppingMallSellerPayout =
    await api.functional.shoppingMall.platformAdmin.sellerPayouts.update(
      connection,
      {
        sellerPayoutId: typia.assert<string & tags.Format<"uuid">>(created.id),
        body: updateBody,
      },
    );
  typia.assert<IShoppingMallSellerPayout>(updated);

  // 5. Assertions
  TestValidator.equals(
    "payout id must remain immutable",
    updated.id,
    originalId,
  );

  TestValidator.equals(
    "sellerId must remain immutable",
    updated.sellerId,
    originalSellerId,
  );

  TestValidator.equals(
    "payoutStatus should transition to sent",
    updated.payoutStatus,
    "payout_sent",
  );

  TestValidator.notEquals(
    "payoutStatus should change compared to original",
    updated.payoutStatus,
    originalStatus,
  );

  TestValidator.notEquals(
    "updatedAt should be refreshed after update",
    updated.updatedAt,
    originalUpdatedAt,
  );

  TestValidator.equals(
    "providerName should reflect updated value",
    updated.providerName ?? null,
    providerName,
  );

  TestValidator.equals(
    "providerPayoutId should reflect updated value",
    updated.providerPayoutId ?? null,
    providerPayoutId,
  );
}
