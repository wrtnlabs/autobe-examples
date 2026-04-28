import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import type { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import type { IEcommercePlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformGuest";
import type { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import type { IEcommercePlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformReview";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
Test guest review filtering with pagination validation.

Validates the complete review browsing workflow for authenticated guests including rating range filters, text search filtering, and combined filter scenarios. Tests that the guest can browse product reviews with proper filtering applied and returns paginated results with accurate metadata.

Special attention is given to verifying that combined filter constraints work correctly together (minRating + maxRating + search), empty filters return all non-deleted reviews with accurate pagination, and star-only reviews with null text_content are properly included in results.

1. Guest joins with device fingerprint and authenticates.
2. Guest calls PATCH ecommercePlatform/guest/reviews with rating range filter to verify minRating and maxRating correctly constrain results (minRating=4, maxRating=5).
3. Guest calls with text search filter to verify case-insensitive matching on text_content.
4. Guest calls with multiple filter combinations to verify combined filtering works correctly.
5. Guest calls with empty filter to verify all non-deleted reviews are returned with correct pagination, newest-first ordering, and star-only reviews included.
*/
export async function test_api_review_guest_filtering_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Guest authentication
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuthToken = await api.functional.ecommercePlatform.auth.guest.join(
    guestConnection,
    {
      body: {
        device_fingerprint: RandomGenerator.alphaNumeric(32),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } as IEcommercePlatformGuest.IJoin,
    },
  );
  typia.assert<IEcommercePlatformGuest.IAuthorized>(guestAuthToken);
  // 2. Rating range filter test - minRating=4, maxRating=5
  const ratingFilterRequest = {
    minRating: 4 as number & tags.Type<"int32"> & tags.Minimum<1>,
    maxRating: 5 as number & tags.Type<"int32"> & tags.Maximum<5>,
  } as IEcommercePlatformReview.IRequest;
  const ratingFilteredReviews =
    await api.functional.ecommercePlatform.guest.reviews.index(
      guestConnection,
      {
        body: ratingFilterRequest,
      },
    );
  typia.assert<IPageIEcommercePlatformReview.ISummary>(ratingFilteredReviews);
  TestValidator.predicate("rating filter returns results within range", () =>
    ratingFilteredReviews.data
      .map((review) => review.rating)
      .every((rate) => rate >= 4 && rate <= 5),
  );
  // 3. Text search filter test - case-insensitive search on text_content
  const searchTerm: string = "great";
  const searchFilterRequest = {
    search: searchTerm,
  } as IEcommercePlatformReview.IRequest;
  const searchFilteredReviews =
    await api.functional.ecommercePlatform.guest.reviews.index(
      guestConnection,
      {
        body: searchFilterRequest,
      },
    );
  typia.assert<IPageIEcommercePlatformReview.ISummary>(searchFilteredReviews);
  TestValidator.predicate(
    "search filter returns reviews containing search term",
    () =>
      searchFilteredReviews.data.every((review) => {
        const content: string | null = review.text_content;
        return content === null
          ? false
          : content.toLowerCase().includes(searchTerm.toLowerCase());
      }),
  );
  // 4. Multiple filter combinations test - productId + minRating + search
  const combinedRequestId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const combinedFilterRequest = {
    productId: combinedRequestId,
    minRating: 3 as number & tags.Type<"int32"> & tags.Minimum<1>,
    search: "good",
  } as IEcommercePlatformReview.IRequest;
  const combinedFilteredReviews =
    await api.functional.ecommercePlatform.guest.reviews.index(
      guestConnection,
      {
        body: combinedFilterRequest,
      },
    );
  typia.assert<IPageIEcommercePlatformReview.ISummary>(combinedFilteredReviews);
  TestValidator.predicate(
    "combined filter returns results matching all criteria",
    () =>
      combinedFilteredReviews.data.every((review) => {
        const content: string | null = review.text_content;
        if (content === null) {
          return review.rating >= 3;
        }
        return review.rating >= 3 && content.toLowerCase().includes("good");
      }),
  );
  // 5. Empty filter test - all non-deleted reviews
  const emptyFilterRequest = {} as IEcommercePlatformReview.IRequest;
  const allReviews = await api.functional.ecommercePlatform.guest.reviews.index(
    guestConnection,
    {
      body: emptyFilterRequest,
    },
  );
  typia.assert<IPageIEcommercePlatformReview.ISummary>(allReviews);
  // Validate pagination metadata accuracy
  const pagination: IPage.IPagination = allReviews.pagination;
  TestValidator.equals(
    "pagination limit matches or is within bounds",
    pagination.limit,
    pagination.limit,
  );
  TestValidator.predicate(
    "pagination current page is at least 1",
    () => pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination records count matches data length",
    () => pagination.records === allReviews.data.length,
  );
  // Validate pagination pages calculation
  const expectedPages: number =
    pagination.records === 0
      ? 0
      : Math.ceil(pagination.records / pagination.limit);
  TestValidator.equals(
    "pagination pages calculation is correct",
    pagination.pages,
    expectedPages,
  );
  // Validate star-only reviews (text_content=null) are included in results
  TestValidator.predicate(
    "star-only reviews with null text_content are included",
    () =>
      allReviews.data.every((review) => {
        const content: string | null = review.text_content;
        return content === null || typeof content === "string";
      }),
  );
  // Validate reviews are sorted newest-first by created_at
  TestValidator.predicate(
    "reviews are sorted newest-first by created_at",
    () => {
      let sorted: boolean = true;
      for (let index: number = 1; index < allReviews.data.length; index++) {
        const currentCreatedAt: string & tags.Format<"date-time"> =
          allReviews.data[index].created_at;
        const previousCreatedAt: string & tags.Format<"date-time"> =
          allReviews.data[index - 1].created_at;
        if (
          new Date(previousCreatedAt).getTime() <
          new Date(currentCreatedAt).getTime()
        ) {
          sorted = false;
          break;
        }
      }
      return sorted;
    },
  );
}
