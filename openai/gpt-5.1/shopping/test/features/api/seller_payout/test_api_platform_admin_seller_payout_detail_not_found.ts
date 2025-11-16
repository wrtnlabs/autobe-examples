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
 * Validate that a platform admin receives an error when requesting seller
 * payout details for a non-existent payout id, while valid ids still succeed.
 *
 * Business context:
 *
 * - Platform admins use the seller payout detail endpoint to inspect payout
 *   batches created for sellers.
 * - When a payout id does not correspond to any existing record (or has been
 *   removed per retention policy), the backend should treat it as a missing
 *   resource rather than returning partial or misleading data.
 *
 * Scenario steps:
 *
 * 1. Join as a platform admin via POST /auth/platformAdmin/join so that all
 *    subsequent calls execute under a valid platform admin authorization
 *    context.
 * 2. (Optional sanity check) Create a guest cart via POST /shoppingMall/guestCarts
 *    to ensure the environment is healthy and unrelated APIs work; the cart
 *    itself is not used later.
 * 3. Create a real seller payout via POST
 *    /shoppingMall/platformAdmin/sellerPayouts using random but schema-valid
 *    values; assert its response shape with typia.assert.
 * 4. Call GET /shoppingMall/platformAdmin/sellerPayouts/{sellerPayoutId} with the
 *    real payout id and assert success using typia.assert to demonstrate that
 *    the detail endpoint works for existing resources.
 * 5. Construct a different, well-formed random payout id string that is guaranteed
 *    not to equal the created payout's id.
 * 6. Invoke the same GET detail endpoint with this non-existent id and use
 *    TestValidator.error to assert that an error is thrown (without checking
 *    concrete HTTP status code or error payload structure).
 * 7. Ensure that no partial payout data is returned for the non-existent id and
 *    that the contract remains type-safe by never treating the error case as a
 *    successful IShoppingMallSellerPayout.
 */
export async function test_api_platform_admin_seller_payout_detail_not_found(
  connection: api.IConnection,
) {
  // 1. Register a platform admin and obtain authorized session via join.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Optional sanity: create a guest cart to confirm general functionality.
  const guestCartBody = {
    guest_token: RandomGenerator.alphaNumeric(16),
    ip: "127.0.0.1",
    user_agent: "E2E-Test-Agent/1.0",
    referrer: "https://shop.example.com/landing",
    region_code: "KR",
  } satisfies IShoppingMallGuestCart.ICreate;

  const guestCart: IShoppingMallGuestCart =
    await api.functional.shoppingMall.guestCarts.create(connection, {
      body: guestCartBody,
    });
  typia.assert(guestCart);

  // 3. Create a real seller payout batch as platform admin.
  const payoutCreateBody = {
    seller_id: typia.random<string & tags.Format<"uuid">>(),
    currency_code: "USD",
    gross_amount: 1000,
    fee_amount: 100,
    adjustment_amount: 0,
    net_amount: 900,
    period_start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    period_end: new Date().toISOString(),
    payout_status: "payout_pending",
    scheduled_payout_at: new Date(
      Date.now() + 24 * 60 * 60 * 1000,
    ).toISOString(),
    memo: "E2E test payout batch",
  } satisfies IShoppingMallSellerPayout.ICreate;

  const createdPayout: IShoppingMallSellerPayout =
    await api.functional.shoppingMall.platformAdmin.sellerPayouts.create(
      connection,
      {
        body: payoutCreateBody,
      },
    );
  typia.assert(createdPayout);

  // 4. Verify that the detail endpoint works for an existing payout id.
  const fetchedExisting: IShoppingMallSellerPayout =
    await api.functional.shoppingMall.platformAdmin.sellerPayouts.at(
      connection,
      {
        sellerPayoutId: createdPayout.id,
      },
    );
  typia.assert(fetchedExisting);
  TestValidator.equals(
    "existing payout detail should match created payout id",
    fetchedExisting.id,
    createdPayout.id,
  );

  // 5. Generate a well-formed but non-existent payout id.
  let nonExistentId: string = typia.random<string & tags.Format<"uuid">>();
  if (nonExistentId === createdPayout.id) {
    nonExistentId = typia.random<string & tags.Format<"uuid">>();
  }

  TestValidator.notEquals(
    "non-existent payout id must differ from created payout id",
    nonExistentId,
    createdPayout.id,
  );

  // 6. Call detail endpoint with non-existent id and assert that it fails.
  await TestValidator.error(
    "requesting payout detail with non-existent id should fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.sellerPayouts.at(
        connection,
        {
          sellerPayoutId: nonExistentId,
        },
      );
    },
  );
}
