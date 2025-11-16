import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerPayout } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerPayout";
import type { IShoppingMallGuestCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestCart";
import type { IShoppingMallGuestCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestCartItem";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerPayout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPayout";

/**
 * Basic seller payout search flow for platform admin.
 *
 * This test validates that a platform administrator, once registered and
 * implicitly authenticated via POST /auth/platformAdmin/join, can:
 *
 * 1. Ensure some upstream guest activity exists by creating a guest cart.
 * 2. Create at least one seller payout batch using the platformAdmin payout
 *    creation endpoint.
 * 3. Call the seller payout search endpoint with minimal pagination filters (page
 *    and limit only).
 * 4. Receive a paginated list of seller payout summaries that includes the newly
 *    created payout.
 * 5. Observe that key summary fields are populated consistently and that no
 *    authentication or authorization errors occur.
 */
export async function test_api_platform_admin_seller_payout_search_basic_flow(
  connection: api.IConnection,
) {
  // 1. Register a new platform admin (also establishes Authorization header)
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: "203.0.113.10",
    href: "https://admin.example.com/signup",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create a guest cart to simulate upstream guest activity
  const guestCartBody = {
    guest_token: RandomGenerator.alphaNumeric(16),
    ip: "198.51.100.25",
    user_agent: "Mozilla/5.0 (E2E Test GuestCart)",
    referrer: "https://shop.example.com/campaign",
    region_code: "KR",
  } satisfies IShoppingMallGuestCart.ICreate;

  const guestCart: IShoppingMallGuestCart =
    await api.functional.shoppingMall.guestCarts.create(connection, {
      body: guestCartBody,
    });
  typia.assert(guestCart);

  // 3. Create at least one seller payout batch
  const sellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const currency = "KRW";
  const grossAmount = 100_000;
  const feeAmount = 5_000;
  const adjustmentAmount = 1_000;
  const netAmount = grossAmount - feeAmount + adjustmentAmount;

  const now = new Date();
  const periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const payoutCreateBody = {
    seller_id: sellerId,
    currency_code: currency,
    gross_amount: grossAmount,
    fee_amount: feeAmount,
    adjustment_amount: adjustmentAmount,
    net_amount: netAmount,
    period_start: periodStart.toISOString(),
    period_end: now.toISOString(),
    payout_status: "payout_pending",
    scheduled_payout_at: new Date(
      now.getTime() + 24 * 60 * 60 * 1000,
    ).toISOString(),
    memo: "E2E basic payout batch for search test",
  } satisfies IShoppingMallSellerPayout.ICreate;

  const createdPayout: IShoppingMallSellerPayout =
    await api.functional.shoppingMall.platformAdmin.sellerPayouts.create(
      connection,
      {
        body: payoutCreateBody,
      },
    );
  typia.assert(createdPayout);

  // 4. Call seller payout search with minimal pagination (page, limit)
  const page = 1;
  const limit = 20;

  const searchRequestBody = {
    page,
    limit,
  } satisfies IShoppingMallSellerPayout.IRequest;

  const pageResult: IPageIShoppingMallSellerPayout.ISummary =
    await api.functional.shoppingMall.platformAdmin.sellerPayouts.index(
      connection,
      {
        body: searchRequestBody,
      },
    );
  typia.assert(pageResult);

  const pagination: IPage.IPagination = pageResult.pagination;
  typia.assert(pagination);

  // 5. Basic pagination assertions
  TestValidator.predicate(
    "pagination records should be non-negative",
    pagination.records >= 0,
  );

  TestValidator.predicate(
    "pagination pages should be consistent",
    pagination.pages >= 0,
  );

  // 6. Ensure at least one payout is present in the search results
  const summaries: IShoppingMallSellerPayout.ISummary[] = pageResult.data;

  TestValidator.predicate(
    "payout summaries list should contain at least one record",
    summaries.length >= 1,
  );

  // 7. Find the created payout in the summaries by matching id
  const matchedSummary: IShoppingMallSellerPayout.ISummary | undefined =
    summaries.find((summary) => summary.id === createdPayout.id);

  TestValidator.predicate(
    "created payout should appear in search results",
    matchedSummary !== undefined,
  );

  if (matchedSummary !== undefined) {
    // 8. Validate essential summary fields for the matched payout
    TestValidator.equals(
      "matched summary id should equal created payout id",
      matchedSummary.id,
      createdPayout.id,
    );

    TestValidator.predicate(
      "matched summary payout_number should be non-empty",
      matchedSummary.payout_number.length > 0,
    );

    TestValidator.equals(
      "matched summary currency should equal created payout currency",
      matchedSummary.currency,
      createdPayout.currency,
    );

    TestValidator.equals(
      "matched summary net_amount should equal created payout netAmount",
      matchedSummary.net_amount,
      createdPayout.netAmount,
    );

    TestValidator.predicate(
      "matched summary payout_status should be non-empty",
      matchedSummary.payout_status.length > 0,
    );

    TestValidator.predicate(
      "matched summary created_at should look like a date-time string",
      matchedSummary.created_at.length > 0,
    );

    const sellerSummary = matchedSummary.seller;

    TestValidator.predicate(
      "matched summary seller summary should be present",
      !!sellerSummary,
    );

    if (sellerSummary) {
      TestValidator.predicate(
        "seller summary id should be non-empty",
        sellerSummary.id.length > 0,
      );

      TestValidator.predicate(
        "seller summary store_name should be non-empty",
        sellerSummary.store_name.length > 0,
      );
    }
  }
}
