import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test buyer review sorting functionality with multiple criteria and orders.
 *
 * This test validates that buyers can organize their review history by
 * different sorting options including creation date (newest/oldest first), star
 * rating (highest/lowest first), and helpfulness votes (most/least helpful
 * first).
 *
 * The test authenticates a buyer account and systematically tests all sort_by
 * options (created_at, rating, helpfulness) with both ascending and descending
 * order to ensure the API returns correctly ordered results based on the
 * buyer's existing reviews.
 *
 * Steps:
 *
 * 1. Create and authenticate a buyer account
 * 2. Test sorting by creation date (ascending and descending)
 * 3. Test sorting by star rating (ascending and descending)
 * 4. Test sorting by helpfulness votes (ascending and descending)
 * 5. Validate correct ordering for each sort option
 */
export async function test_api_buyer_reviews_sorting_options(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate buyer account
  const buyerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallBuyer.ICreate;

  const buyer = await api.functional.auth.buyer.join(connection, {
    body: buyerData,
  });
  typia.assert(buyer);

  // Step 2: Test sorting by created_at - descending (newest first)
  const sortByDateDesc =
    await api.functional.shoppingMall.buyer.buyers.reviews.index(connection, {
      buyerId: buyer.id,
      body: {
        sort_by: "created_at",
        sort_order: "desc",
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(sortByDateDesc);

  // Validate descending date order (newest to oldest)
  if (sortByDateDesc.data.length > 1) {
    for (let i = 0; i < sortByDateDesc.data.length - 1; i++) {
      const current = new Date(sortByDateDesc.data[i].created_at).getTime();
      const next = new Date(sortByDateDesc.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        "reviews sorted by date descending - current should be >= next",
        current >= next,
      );
    }
  }

  // Step 3: Test sorting by created_at - ascending (oldest first)
  const sortByDateAsc =
    await api.functional.shoppingMall.buyer.buyers.reviews.index(connection, {
      buyerId: buyer.id,
      body: {
        sort_by: "created_at",
        sort_order: "asc",
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(sortByDateAsc);

  // Validate ascending date order (oldest to newest)
  if (sortByDateAsc.data.length > 1) {
    for (let i = 0; i < sortByDateAsc.data.length - 1; i++) {
      const current = new Date(sortByDateAsc.data[i].created_at).getTime();
      const next = new Date(sortByDateAsc.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        "reviews sorted by date ascending - current should be <= next",
        current <= next,
      );
    }
  }

  // Step 4: Test sorting by rating - descending (highest rating first)
  const sortByRatingDesc =
    await api.functional.shoppingMall.buyer.buyers.reviews.index(connection, {
      buyerId: buyer.id,
      body: {
        sort_by: "rating",
        sort_order: "desc",
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(sortByRatingDesc);

  // Validate descending rating order (highest to lowest)
  if (sortByRatingDesc.data.length > 1) {
    for (let i = 0; i < sortByRatingDesc.data.length - 1; i++) {
      const currentRating = sortByRatingDesc.data[i].star_rating;
      const nextRating = sortByRatingDesc.data[i + 1].star_rating;
      TestValidator.predicate(
        "reviews sorted by rating descending - current should be >= next",
        currentRating >= nextRating,
      );
    }
  }

  // Step 5: Test sorting by rating - ascending (lowest rating first)
  const sortByRatingAsc =
    await api.functional.shoppingMall.buyer.buyers.reviews.index(connection, {
      buyerId: buyer.id,
      body: {
        sort_by: "rating",
        sort_order: "asc",
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(sortByRatingAsc);

  // Validate ascending rating order (lowest to highest)
  if (sortByRatingAsc.data.length > 1) {
    for (let i = 0; i < sortByRatingAsc.data.length - 1; i++) {
      const currentRating = sortByRatingAsc.data[i].star_rating;
      const nextRating = sortByRatingAsc.data[i + 1].star_rating;
      TestValidator.predicate(
        "reviews sorted by rating ascending - current should be <= next",
        currentRating <= nextRating,
      );
    }
  }

  // Step 6: Test sorting by helpfulness - descending (most helpful first)
  const sortByHelpfulnessDesc =
    await api.functional.shoppingMall.buyer.buyers.reviews.index(connection, {
      buyerId: buyer.id,
      body: {
        sort_by: "helpfulness",
        sort_order: "desc",
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(sortByHelpfulnessDesc);

  // Validate descending helpfulness order (most to least helpful)
  if (sortByHelpfulnessDesc.data.length > 1) {
    for (let i = 0; i < sortByHelpfulnessDesc.data.length - 1; i++) {
      const currentVotes = sortByHelpfulnessDesc.data[i].helpfulness_vote_count;
      const nextVotes =
        sortByHelpfulnessDesc.data[i + 1].helpfulness_vote_count;
      TestValidator.predicate(
        "reviews sorted by helpfulness descending - current should be >= next",
        currentVotes >= nextVotes,
      );
    }
  }

  // Step 7: Test sorting by helpfulness - ascending (least helpful first)
  const sortByHelpfulnessAsc =
    await api.functional.shoppingMall.buyer.buyers.reviews.index(connection, {
      buyerId: buyer.id,
      body: {
        sort_by: "helpfulness",
        sort_order: "asc",
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(sortByHelpfulnessAsc);

  // Validate ascending helpfulness order (least to most helpful)
  if (sortByHelpfulnessAsc.data.length > 1) {
    for (let i = 0; i < sortByHelpfulnessAsc.data.length - 1; i++) {
      const currentVotes = sortByHelpfulnessAsc.data[i].helpfulness_vote_count;
      const nextVotes = sortByHelpfulnessAsc.data[i + 1].helpfulness_vote_count;
      TestValidator.predicate(
        "reviews sorted by helpfulness ascending - current should be <= next",
        currentVotes <= nextVotes,
      );
    }
  }
}
