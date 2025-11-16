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
 * Validate that a platform administrator can create and then delete a seller
 * payout batch in a basic happy-path scenario.
 *
 * Business flow covered by this test:
 *
 * 1. Register a new platform admin using POST /auth/platformAdmin/join.
 *
 *    - This both creates the admin identity and establishes an authenticated session
 *         via token propagation in the SDK.
 * 2. As a public (unauthenticated) actor, create a guest cart via POST
 *    /shoppingMall/guestCarts to exercise one upstream shopping activity
 *    dependency mentioned in the scenario.
 * 3. As the authenticated platform admin, create a seller payout batch via POST
 *    /shoppingMall/platformAdmin/sellerPayouts with realistic monetary values
 *    and a plausible earnings period.
 * 4. Verify the created payout structure with typia.assert and basic business
 *    invariants (e.g., sellerId matches request, netAmount equals the requested
 *    net_amount).
 * 5. Call DELETE /shoppingMall/platformAdmin/sellerPayouts/{id} through
 *    api.functional.shoppingMall.platformAdmin.sellerPayouts.erase and confirm
 *    that it completes without throwing (implicit 2xx handling in the SDK).
 * 6. Additionally verify that an unauthenticated connection cannot delete payouts
 *    by calling erase on a copy of the connection with empty headers and
 *    expecting an error via TestValidator.error.
 */
export async function test_api_platform_admin_delete_seller_payout_basic_happy_path(
  connection: api.IConnection,
) {
  // 1. Register a new platform administrator and obtain an authorized session.
  const adminJoinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.1",
    href: "https://admin.example.com/onboarding",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a guest cart as unauthenticated context.
  const guestCartBody = {
    guest_token: RandomGenerator.alphaNumeric(24),
    ip: "127.0.0.1",
    user_agent: "Mozilla/5.0 (E2E Test Guest Cart)",
    referrer: "https://shop.example.com/campaign",
    region_code: "KR",
  } satisfies IShoppingMallGuestCart.ICreate;

  const guestCart: IShoppingMallGuestCart =
    await api.functional.shoppingMall.guestCarts.create(connection, {
      body: guestCartBody,
    });
  typia.assert(guestCart);

  // 3. As the authenticated platform admin, create a seller payout batch.
  const sellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const grossAmount = 1_000_000; // e.g., 1,000,000 KRW
  const feeAmount = 50_000; // platform commission
  const adjustmentAmount = -10_000; // manual debit adjustment
  const netAmount = grossAmount - feeAmount + adjustmentAmount;

  const now = new Date();
  const periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const periodEnd = now;

  const payoutCreateBody = {
    seller_id: sellerId,
    currency_code: "KRW",
    gross_amount: grossAmount,
    fee_amount: feeAmount,
    adjustment_amount: adjustmentAmount,
    net_amount: netAmount,
    period_start: periodStart.toISOString(),
    period_end: periodEnd.toISOString(),
    payout_status: "payout_pending",
    scheduled_payout_at: new Date(
      now.getTime() + 2 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    memo: "E2E test payout batch for deletion happy-path.",
  } satisfies IShoppingMallSellerPayout.ICreate;

  const createdPayout: IShoppingMallSellerPayout =
    await api.functional.shoppingMall.platformAdmin.sellerPayouts.create(
      connection,
      {
        body: payoutCreateBody,
      },
    );
  typia.assert(createdPayout);

  // Business invariants: sellerId and netAmount should reflect input.
  TestValidator.equals(
    "created payout sellerId must match request seller_id",
    createdPayout.sellerId,
    sellerId,
  );
  TestValidator.equals(
    "created payout netAmount must match request net_amount",
    createdPayout.netAmount,
    netAmount,
  );

  // 4. Delete the created seller payout batch as the same platform admin.
  await api.functional.shoppingMall.platformAdmin.sellerPayouts.erase(
    connection,
    {
      sellerPayoutId: createdPayout.id as string & tags.Format<"uuid">,
    },
  );

  // 5. Ensure that unauthenticated clients cannot delete payouts.
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "unauthenticated connection must not be able to delete seller payout",
    async () => {
      await api.functional.shoppingMall.platformAdmin.sellerPayouts.erase(
        unauthConn,
        {
          sellerPayoutId: createdPayout.id as string & tags.Format<"uuid">,
        },
      );
    },
  );
}
