import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";
import type { IShoppingMallBuyerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyerAddress";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSeller";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallReviewImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewImage";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test all available sorting options for seller product reviews.
 *
 * This test validates that the review sorting API accepts all valid sorting
 * parameters (created_at, rating, helpfulness) with both ascending and
 * descending order. Due to API limitations (missing cart, address, payment, and
 * SKU creation endpoints), this test validates the sorting interface
 * functionality rather than creating complete test data.
 *
 * Test workflow:
 *
 * 1. Register seller account
 * 2. Test all sorting parameter combinations
 * 3. Verify API accepts valid sort parameters and returns proper responses
 */
export async function test_api_seller_reviews_sorting_options(
  connection: api.IConnection,
) {
  // 1. Register seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.MinLength<8>>();

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        business_name: RandomGenerator.name(2),
        business_description: RandomGenerator.paragraph({ sentences: 5 }),
        store_name: RandomGenerator.name(2),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // 2. Test sort_by=created_at with sort_order=desc (newest first - default)
  const byCreatedDesc: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.seller.sellers.reviews.index(connection, {
      sellerId: seller.id,
      body: {
        sort_by: "created_at",
        sort_order: "desc",
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(byCreatedDesc);

  // Verify descending order by created_at if reviews exist
  if (byCreatedDesc.data.length > 1) {
    for (let i = 0; i < byCreatedDesc.data.length - 1; i++) {
      const current = new Date(byCreatedDesc.data[i].created_at);
      const next = new Date(byCreatedDesc.data[i + 1].created_at);
      TestValidator.predicate(
        "reviews ordered by created_at descending",
        current >= next,
      );
    }
  }

  // 3. Test sort_by=created_at with sort_order=asc (oldest first)
  const byCreatedAsc: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.seller.sellers.reviews.index(connection, {
      sellerId: seller.id,
      body: {
        sort_by: "created_at",
        sort_order: "asc",
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(byCreatedAsc);

  // Verify ascending order by created_at if reviews exist
  if (byCreatedAsc.data.length > 1) {
    for (let i = 0; i < byCreatedAsc.data.length - 1; i++) {
      const current = new Date(byCreatedAsc.data[i].created_at);
      const next = new Date(byCreatedAsc.data[i + 1].created_at);
      TestValidator.predicate(
        "reviews ordered by created_at ascending",
        current <= next,
      );
    }
  }

  // 4. Test sort_by=rating with sort_order=desc (highest rated first)
  const byRatingDesc: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.seller.sellers.reviews.index(connection, {
      sellerId: seller.id,
      body: {
        sort_by: "rating",
        sort_order: "desc",
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(byRatingDesc);

  // Verify descending order by rating if reviews exist
  if (byRatingDesc.data.length > 1) {
    for (let i = 0; i < byRatingDesc.data.length - 1; i++) {
      TestValidator.predicate(
        "reviews ordered by rating descending",
        byRatingDesc.data[i].star_rating >=
          byRatingDesc.data[i + 1].star_rating,
      );
    }
  }

  // 5. Test sort_by=rating with sort_order=asc (lowest rated first)
  const byRatingAsc: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.seller.sellers.reviews.index(connection, {
      sellerId: seller.id,
      body: {
        sort_by: "rating",
        sort_order: "asc",
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(byRatingAsc);

  // Verify ascending order by rating if reviews exist
  if (byRatingAsc.data.length > 1) {
    for (let i = 0; i < byRatingAsc.data.length - 1; i++) {
      TestValidator.predicate(
        "reviews ordered by rating ascending",
        byRatingAsc.data[i].star_rating <= byRatingAsc.data[i + 1].star_rating,
      );
    }
  }

  // 6. Test sort_by=helpfulness with sort_order=desc (most helpful first)
  const byHelpfulDesc: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.seller.sellers.reviews.index(connection, {
      sellerId: seller.id,
      body: {
        sort_by: "helpfulness",
        sort_order: "desc",
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(byHelpfulDesc);

  // Verify descending order by helpfulness if reviews exist
  if (byHelpfulDesc.data.length > 1) {
    for (let i = 0; i < byHelpfulDesc.data.length - 1; i++) {
      TestValidator.predicate(
        "reviews ordered by helpfulness descending",
        byHelpfulDesc.data[i].helpfulness_vote_count >=
          byHelpfulDesc.data[i + 1].helpfulness_vote_count,
      );
    }
  }

  // 7. Test sort_by=helpfulness with sort_order=asc (least helpful first)
  const byHelpfulAsc: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.seller.sellers.reviews.index(connection, {
      sellerId: seller.id,
      body: {
        sort_by: "helpfulness",
        sort_order: "asc",
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(byHelpfulAsc);

  // Verify ascending order by helpfulness if reviews exist
  if (byHelpfulAsc.data.length > 1) {
    for (let i = 0; i < byHelpfulAsc.data.length - 1; i++) {
      TestValidator.predicate(
        "reviews ordered by helpfulness ascending",
        byHelpfulAsc.data[i].helpfulness_vote_count <=
          byHelpfulAsc.data[i + 1].helpfulness_vote_count,
      );
    }
  }
}
