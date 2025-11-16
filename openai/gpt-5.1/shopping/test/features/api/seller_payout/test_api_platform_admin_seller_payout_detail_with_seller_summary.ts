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
 * Validate that seller payout detail includes consistent seller linkage and
 * mirrors core payout fields from creation.
 *
 * Business goals:
 *
 * - Ensure a platform admin can create a seller payout batch.
 * - Ensure the detail endpoint returns the same payout with consistent
 *   identifiers and monetary fields.
 * - When a seller summary is present on the payout detail, verify that it is
 *   structurally valid and its id matches the payout.sellerId.
 *
 * Steps:
 *
 * 1. Join a platform admin to establish an authorized session.
 * 2. Create a guest cart to honor upstream assumptions (smoke check only).
 * 3. Create a seller payout for a synthetic seller_id with realistic monetary
 *    values and scheduling metadata.
 * 4. Fetch payout detail by id.
 * 5. Assert type correctness of both creation and detail responses.
 * 6. Assert that core fields (id, sellerId, currency, grossAmount, netAmount) are
 *    identical between create and detail responses.
 * 7. If seller summary is present in the detail response, assert that its id
 *    matches sellerId and rely on typia.assert for full structural validation.
 */
export async function test_api_platform_admin_seller_payout_detail_with_seller_summary(
  connection: api.IConnection,
) {
  // 1. Join a platform admin (establish Authorization context)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: "127.0.0.1",
    href: "https://admin.shopping-mall.test/join",
    referrer: "https://shopping-mall.test/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create a guest cart (dependency smoke check)
  const guestCartBody = {
    guest_token: RandomGenerator.alphaNumeric(24),
    ip: "127.0.0.1",
    user_agent: "Mozilla/5.0 (E2E Test)",
    referrer: "https://shopping-mall.test/home" as string & tags.Format<"uri">,
    region_code: "KR",
  } satisfies IShoppingMallGuestCart.ICreate;

  const guestCart: IShoppingMallGuestCart =
    await api.functional.shoppingMall.guestCarts.create(connection, {
      body: guestCartBody,
    });
  typia.assert(guestCart);

  // 3. Create a seller payout for a synthetic seller_id
  const sellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const grossAmount = 100000;
  const feeAmount = 5000;
  const adjustmentAmount = -2000;
  const netAmount = grossAmount - feeAmount + adjustmentAmount;

  const now = new Date();
  const periodStart = new Date(
    now.getTime() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;
  const periodEnd = now.toISOString() as string & tags.Format<"date-time">;
  const scheduledAt = new Date(
    now.getTime() + 24 * 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;

  const payoutCreateBody = {
    seller_id: sellerId,
    currency_code: "KRW",
    gross_amount: grossAmount,
    fee_amount: feeAmount,
    adjustment_amount: adjustmentAmount,
    net_amount: netAmount,
    period_start: periodStart,
    period_end: periodEnd,
    payout_status: "payout_pending",
    scheduled_payout_at: scheduledAt,
    memo: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IShoppingMallSellerPayout.ICreate;

  const created: IShoppingMallSellerPayout =
    await api.functional.shoppingMall.platformAdmin.sellerPayouts.create(
      connection,
      {
        body: payoutCreateBody,
      },
    );
  typia.assert(created);

  // 4. Fetch payout detail by id
  const detailed: IShoppingMallSellerPayout =
    await api.functional.shoppingMall.platformAdmin.sellerPayouts.at(
      connection,
      {
        sellerPayoutId: created.id,
      },
    );
  typia.assert(detailed);

  // 5. Core identity consistency
  TestValidator.equals(
    "payout id from detail must match created payout id",
    detailed.id,
    created.id,
  );

  TestValidator.equals(
    "sellerId from detail must match created sellerId",
    detailed.sellerId,
    created.sellerId,
  );

  // 6. Monetary and currency consistency
  TestValidator.equals(
    "currency must remain consistent between create and detail",
    detailed.currency,
    created.currency,
  );

  TestValidator.equals(
    "grossAmount must remain consistent between create and detail",
    detailed.grossAmount,
    created.grossAmount,
  );

  TestValidator.equals(
    "netAmount must remain consistent between create and detail",
    detailed.netAmount,
    created.netAmount,
  );

  // 7. Seller summary, if present, must align with sellerId
  if (detailed.seller !== undefined) {
    typia.assert(detailed.seller);

    TestValidator.equals(
      "seller summary id must match payout sellerId",
      detailed.seller.id,
      detailed.sellerId,
    );
  }
}
