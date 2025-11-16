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
 * Validate deletion behavior when targeting a non-existent seller payout batch.
 *
 * Business context:
 *
 * - Platform admins manage seller payout batches through the sellerPayouts APIs.
 * - Deleting a payout that does not exist must fail with a clear error without
 *   impacting existing payout records.
 * - Authentication must succeed and the failure reason must be purely about the
 *   missing payout resource.
 *
 * Steps:
 *
 * 1. Join as a new platform admin via POST /auth/platformAdmin/join so that the
 *    connection is authenticated as a platform admin.
 * 2. Create a guest cart via POST /shoppingMall/guestCarts to exercise an
 *    orthogonal piece of data; this step has no direct linkage to payouts but
 *    ensures that unrelated data exists in the system.
 * 3. Create a real seller payout batch via POST
 *    /shoppingMall/platformAdmin/sellerPayouts and capture its id. This serves
 *    as the control record that must not be affected by later failed deletes.
 * 4. Generate a random UUID that is guaranteed to be different from the real
 *    payout id created in step 3.
 * 5. As the authenticated platform admin, call DELETE
 *    /shoppingMall/platformAdmin/sellerPayouts/{sellerPayoutId} using the
 *    non-existent id and verify that the call fails by using
 *    TestValidator.error.
 * 6. Optionally, repeat the delete call with the same bogus id to demonstrate that
 *    repeated attempts keep failing (idempotent error semantics).
 * 7. Confirm that the successful create operations (guest cart and payout) were
 *    not invalidated by the failed delete attempt by relying on prior
 *    typia.assert validations and the fact that we never delete the real payout
 *    id in this test.
 */
export async function test_api_platform_admin_delete_seller_payout_idempotency_on_nonexistent(
  connection: api.IConnection,
) {
  // 1. Join as a new platform admin to obtain an authorized session.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com" as string & tags.Format<"uri">,
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create a guest cart to ensure unrelated data exists.
  const guestCartBody = {
    guest_token: RandomGenerator.alphaNumeric(24),
    ip: "203.0.113.10",
    user_agent: "Mozilla/5.0 (E2E Test)",
    referrer: "https://shop.example.com/landing" as string & tags.Format<"uri">,
    region_code: "US",
  } satisfies IShoppingMallGuestCart.ICreate;

  const guestCart: IShoppingMallGuestCart =
    await api.functional.shoppingMall.guestCarts.create(connection, {
      body: guestCartBody,
    });
  typia.assert(guestCart);

  // 3. Create a real seller payout batch as control data.
  const now = new Date();
  const future = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const payoutCreateBody = {
    seller_id: typia.random<string & tags.Format<"uuid">>(),
    currency_code: "USD",
    gross_amount: 1000,
    fee_amount: 50,
    adjustment_amount: 0,
    net_amount: 950,
    period_start: now.toISOString() as string & tags.Format<"date-time">,
    period_end: future.toISOString() as string & tags.Format<"date-time">,
    payout_status: "payout_pending",
    scheduled_payout_at: future.toISOString() as string &
      tags.Format<"date-time">,
    memo: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IShoppingMallSellerPayout.ICreate;

  const realPayout: IShoppingMallSellerPayout =
    await api.functional.shoppingMall.platformAdmin.sellerPayouts.create(
      connection,
      {
        body: payoutCreateBody,
      },
    );
  typia.assert(realPayout);

  // 4. Generate a UUID that does not match the created payout id.
  let nonExistentPayoutId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  while (nonExistentPayoutId === realPayout.id) {
    nonExistentPayoutId = typia.random<string & tags.Format<"uuid">>();
  }

  TestValidator.notEquals(
    "non-existent payout id must differ from real payout id",
    realPayout.id,
    nonExistentPayoutId,
  );

  // 5. Attempt to delete a non-existent payout and expect an error.
  await TestValidator.error(
    "deleting a non-existent seller payout should fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.sellerPayouts.erase(
        connection,
        {
          sellerPayoutId: nonExistentPayoutId,
        },
      );
    },
  );

  // 6. Repeat deletion on the same bogus id to check consistent failure.
  await TestValidator.error(
    "repeated delete on the same non-existent payout should also fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.sellerPayouts.erase(
        connection,
        {
          sellerPayoutId: nonExistentPayoutId,
        },
      );
    },
  );

  // 7. Sanity check that our control entities are still structurally valid.
  // We cannot re-read payouts, but we can at least re-assert the in-memory
  // objects that typia has already validated and confirm their ids are intact.
  typia.assert(realPayout);
  typia.assert(guestCart);

  TestValidator.predicate(
    "real payout id should remain a non-empty string",
    realPayout.id.length > 0,
  );
}
