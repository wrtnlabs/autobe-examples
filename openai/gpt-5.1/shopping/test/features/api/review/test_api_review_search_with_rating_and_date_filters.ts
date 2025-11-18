import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItemSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItemSummary";
import type { IShoppingMallCartOwnerCustomerSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerCustomerSummary";
import type { IShoppingMallCartOwnerGuestUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerGuestUserSummary";
import type { IShoppingMallCaseSlaConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCaseSlaConfig";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCountry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCountry";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddressSnapshot";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallCustomerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerLogin";
import type { IShoppingMallDispute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDispute";
import type { IShoppingMallGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUser";
import type { IShoppingMallLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLegalHold";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPayment";
import type { IShoppingMallOrderPriceSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPriceSnapshot";
import type { IShoppingMallOrderShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderShippingAddress";
import type { IShoppingMallOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderStatusHistory";
import type { IShoppingMallPaymentChargeback } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentChargeback";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallPaymentRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentRefund";
import type { IShoppingMallPaymentStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentStatusHistory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegion";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallRiskCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskCase";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import type { IShoppingMallShippingAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddressSnapshot";
import type { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallSkuExternalId } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuExternalId";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";

/**
 * Validate rating-range-based review searching.
 *
 * Business goal: ensure that the global review search endpoint (PATCH
 * /shoppingMall/reviews) correctly applies numeric rating filters so that only
 * reviews whose rating is between `min_rating` and `max_rating` (inclusive) are
 * returned, and that it does not accidentally include reviews outside that
 * range.
 *
 * High-level flow:
 *
 * 1. Register a new customer account (join) so that we can create customer-scoped
 *    reviews using an authenticated context.
 * 2. As that customer, create multiple reviews with different rating values
 *    spanning the full 1–5 range. Keep track of the created review IDs by their
 *    rating so we can later confirm presence/absence in search results.
 * 3. Call the review search endpoint with `min_rating = 4` and `max_rating = 5`,
 *    and with `page = 1`, `limit` large enough to cover all seeded reviews.
 *    Leave date-range fields (`created_from`, `created_to`) null so that we
 *    focus this test purely on rating filter behavior.
 * 4. Validate that every review in the response has rating within [4, 5], that all
 *    seeded 4- and 5-star reviews appear in the result set, and that none of
 *    the seeded reviews with lower ratings (1–3) are present.
 */
export async function test_api_review_search_with_rating_and_date_filters(
  connection: api.IConnection,
) {
  // 1. Register a customer and obtain authorized context
  const joinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://example.com/join" as string & tags.Format<"uri">,
    referrer: "https://example.com/landing" as string & tags.Format<"uri">,
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinRequest,
    });
  typia.assert(customerAuthorized);

  // 2. Seed reviews across different rating values (1–5)
  const seededByRating: Record<number, IShoppingMallReview[]> = {
    1: [],
    2: [],
    3: [],
    4: [],
    5: [],
  };

  const createReview = async (rating: number): Promise<IShoppingMallReview> => {
    const body = {
      rating,
      title: RandomGenerator.paragraph({ sentences: 3 }),
      body: RandomGenerator.content({
        paragraphs: 1,
        sentenceMin: 3,
        sentenceMax: 6,
      }),
    } satisfies IShoppingMallReview.ICreate;

    const review: IShoppingMallReview =
      await api.functional.shoppingMall.customer.reviews.create(connection, {
        body,
      });
    typia.assert(review);
    return review;
  };

  // Create at least one review for each rating, and extra ones for high ratings
  const ratingsToCreate = [1, 2, 3, 4, 4, 5, 5];
  for (const rating of ratingsToCreate) {
    const review = await createReview(rating);
    seededByRating[rating].push(review);
  }

  // 3. Call search endpoint with rating range [4, 5]
  const page = 1;
  const limit = 50;

  const searchRequest = {
    page,
    limit,
    min_rating: 4,
    max_rating: 5,
    created_from: null,
    created_to: null,
    visibility_statuses: null,
    moderation_states: null,
    verified_purchase_only: null,
    incentivized_only: null,
    sort_by: "created_at" as const,
    sort_direction: "desc" as const,
  } satisfies IShoppingMallReview.IRequest;

  const pageResult: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.reviews.index(connection, {
      body: searchRequest,
    });
  typia.assert(pageResult);

  const summaries = pageResult.data;

  // 4-a. Assert all returned reviews are within [4, 5]
  for (const summary of summaries) {
    TestValidator.predicate(
      "search result rating within requested range",
      summary.rating >= 4 && summary.rating <= 5,
    );
  }

  // 4-b. Collect IDs of seeded reviews by rating group
  const highRatedIds = seededByRating[4]
    .concat(seededByRating[5])
    .map((r) => r.id);
  const lowRatedIds = seededByRating[1]
    .concat(seededByRating[2])
    .concat(seededByRating[3])
    .map((r) => r.id);

  const resultIds = summaries.map((s) => s.id);

  // Ensure at least one high-rated seeded review appears
  TestValidator.predicate(
    "at least one seeded high-rated review appears in results",
    highRatedIds.some((id) => resultIds.includes(id)),
  );

  // Ensure that every seeded high-rated review is included (subject to limit)
  for (const id of highRatedIds) {
    TestValidator.predicate(
      "all seeded high-rated reviews must appear in search results",
      resultIds.includes(id),
    );
  }

  // Ensure that none of the low-rated reviews appear in the high-rated filter results
  for (const id of lowRatedIds) {
    TestValidator.predicate(
      "low-rated seeded reviews must not appear in high-rated search results",
      !resultIds.includes(id),
    );
  }

  // 4-c. Basic pagination sanity checks
  const pagination = pageResult.pagination;
  TestValidator.equals(
    "pagination current page matches request",
    pagination.current,
    page,
  );
  TestValidator.equals(
    "pagination limit matches request",
    pagination.limit,
    limit,
  );
  TestValidator.predicate(
    "pagination records is at least number of returned summaries",
    pagination.records >= summaries.length,
  );
}
