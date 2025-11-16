import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPaymentMethod";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

export async function test_api_payment_methods_search_text_and_sorting(
  connection: api.IConnection,
) {
  /**
   * 1. Join as a platform administrator to obtain an authorized admin session.
   * 2. Seed multiple payment methods with carefully controlled display_name and
   *    description values so that full-text search behavior can be asserted
   *    deterministically.
   * 3. Call the search endpoint with a narrow free-text term ("premium") and
   *    verify that only matching methods are returned and are sorted in
   *    descending order by display_name.
   * 4. Call the search endpoint again with a broader term ("Credit Card") and
   *    verify that multiple methods are returned and that the display_name
   *    sorting (desc) is still respected.
   */

  // 1. Register a platform administrator (this will also attach auth token to connection)
  const adminJoinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: "127.0.0.1",
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // Helper to create deterministic payment methods
  const now = new Date();
  const later = new Date(now.getTime() + 1000 * 60 * 60);
  const startsAt = now.toISOString();
  const endsAt = later.toISOString();

  // 2. Seed payment methods with known text patterns
  // 2-1. "Credit Card - Gold" with description containing "premium"
  const goldCreateBody = {
    code: `card_gold_${RandomGenerator.alphaNumeric(6)}`,
    display_name: "Credit Card - Gold",
    description: "Premium tier credit card payment option", // contains "premium"
    provider_key: "provider-gold",
    method_type: "card",
    currency_restriction: "KRW,USD",
    min_amount: 10000,
    max_amount: 1000000,
    priority: 1 as number & tags.Type<"int32">,
    is_active: true,
    starts_at: startsAt,
    ends_at: endsAt,
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const goldMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.platformAdmin.paymentMethods.create(
      connection,
      { body: goldCreateBody },
    );
  typia.assert(goldMethod);

  // 2-2. "Credit Card - Basic" with description containing "starter"
  const basicCreateBody = {
    code: `card_basic_${RandomGenerator.alphaNumeric(6)}`,
    display_name: "Credit Card - Basic",
    description: "Starter tier credit card payment option", // contains "starter"
    provider_key: "provider-basic",
    method_type: "card",
    currency_restriction: "KRW,USD",
    min_amount: 0,
    max_amount: 500000,
    priority: 2 as number & tags.Type<"int32">,
    is_active: true,
    starts_at: startsAt,
    ends_at: endsAt,
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const basicMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.platformAdmin.paymentMethods.create(
      connection,
      { body: basicCreateBody },
    );
  typia.assert(basicMethod);

  // 2-3. "Bank Transfer" with neutral description (no "premium" or "Credit Card")
  const bankCreateBody = {
    code: `bank_transfer_${RandomGenerator.alphaNumeric(6)}`,
    display_name: "Bank Transfer",
    description: "Standard bank transfer payment option", // does not contain keywords
    provider_key: "provider-bank",
    method_type: "bank",
    currency_restriction: "KRW",
    min_amount: 0,
    max_amount: 2000000,
    priority: 3 as number & tags.Type<"int32">,
    is_active: true,
    starts_at: startsAt,
    ends_at: endsAt,
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const bankMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.platformAdmin.paymentMethods.create(
      connection,
      { body: bankCreateBody },
    );
  typia.assert(bankMethod);

  // 3. Search with term "premium" and sort by display_name desc
  const premiumSearchBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<200>,
    search: "premium",
    sort_field: "display_name",
    sort_direction: "desc",
  } satisfies IShoppingMallPaymentMethod.IRequest;

  const premiumPage: IPageIShoppingMallPaymentMethod.ISummary =
    await api.functional.shoppingMall.platformAdmin.paymentMethods.index(
      connection,
      { body: premiumSearchBody },
    );
  typia.assert(premiumPage);

  // Extract only the seeded methods from the result for robust assertion
  const premiumMatches = premiumPage.data.filter((m) =>
    [goldMethod.id, basicMethod.id, bankMethod.id].includes(m.id),
  );

  // We expect that only the Gold method (description contains "premium")
  // is guaranteed to match the search term; Basic and Bank do not contain it.
  TestValidator.predicate(
    "premium search should return at least the gold method and not bank-only method",
    premiumMatches.some((m) => m.id === goldMethod.id) &&
      !premiumMatches.some((m) => m.id === bankMethod.id),
  );

  // If multiple matches come back, validate sort order by display_name desc
  const premiumNames = premiumMatches.map((m) => m.display_name);
  const sortedPremiumNamesDesc = [...premiumNames].sort((a, b) =>
    a < b ? 1 : a > b ? -1 : 0,
  );
  TestValidator.equals(
    "premium search results should be sorted by display_name desc",
    premiumNames,
    sortedPremiumNamesDesc,
  );

  // 4. Search with broader term "Credit Card" expecting both card methods
  const cardSearchBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<200>,
    search: "Credit Card",
    sort_field: "display_name",
    sort_direction: "desc",
  } satisfies IShoppingMallPaymentMethod.IRequest;

  const cardPage: IPageIShoppingMallPaymentMethod.ISummary =
    await api.functional.shoppingMall.platformAdmin.paymentMethods.index(
      connection,
      { body: cardSearchBody },
    );
  typia.assert(cardPage);

  const cardMatches = cardPage.data.filter((m) =>
    [goldMethod.id, basicMethod.id, bankMethod.id].includes(m.id),
  );

  // Expect both credit card methods to be returned, but not bank-only method
  TestValidator.predicate(
    '"Credit Card" search should return both gold and basic card methods and exclude bank transfer',
    cardMatches.some((m) => m.id === goldMethod.id) &&
      cardMatches.some((m) => m.id === basicMethod.id) &&
      !cardMatches.some((m) => m.id === bankMethod.id),
  );

  // Validate sort order among the matched card methods by display_name desc
  const cardNames = cardMatches.map((m) => m.display_name);
  const sortedCardNamesDesc = [...cardNames].sort((a, b) =>
    a < b ? 1 : a > b ? -1 : 0,
  );
  TestValidator.equals(
    '"Credit Card" search results should be sorted by display_name desc',
    cardNames,
    sortedCardNamesDesc,
  );
}
