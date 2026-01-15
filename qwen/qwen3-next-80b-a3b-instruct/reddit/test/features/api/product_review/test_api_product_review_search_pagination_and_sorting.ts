import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProduct";
import type { ICommunityPlatformProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductCategory";
import type { ICommunityPlatformProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductReview";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformProductReview";
import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";
export async function test_api_product_review_search_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create guest connection and authenticate
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuth = await authorize_guest_join(guestConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(guestAuth);
  // guestConnection.headers is now updated with token
  // Step 2: Create a product code for test
  const productCode = typia.random<string>();
  // Step 3: Test pagination and sorting with sort_by=created_at and order=desc
  // Page 1: First set of reviews (newest first)
  const page1 =
    await api.functional.communityPlatform.guest.products.reviews.index(
      guestConnection,
      {
        productCode,
        body: {
          page: 1,
          limit: 10,
          sort_by: "created_at",
          order: "desc",
        } satisfies ICommunityPlatformProductReview.IRequest,
      },
    );
  typia.assert(page1);
  // Validate page 1 has correct pagination structure
  TestValidator.equals("page 1 has correct limit", page1.pagination.limit, 10);
  TestValidator.equals(
    "page 1 has correct page number",
    page1.pagination.current,
    1,
  );
  TestValidator.predicate("page 1 has at least 1 item", page1.data.length > 0);
  // Validate reviews are sorted by creation date (newest first)
  for (let i = 0; i < page1.data.length - 1; i++) {
    TestValidator.predicate(
      `review ${i} is newer than review ${i + 1}`,
      new Date(page1.data[i].created_at) >=
        new Date(page1.data[i + 1].created_at),
    );
  }
  // Step 4: Test page 2: Next set of reviews
  // If there are more than 10 reviews, we should see different reviews
  const page2 =
    await api.functional.communityPlatform.guest.products.reviews.index(
      guestConnection,
      {
        productCode,
        body: {
          page: 2,
          limit: 10,
          sort_by: "created_at",
          order: "desc",
        } satisfies ICommunityPlatformProductReview.IRequest,
      },
    );
  typia.assert(page2);
  // Validate page 2 has correct pagination structure
  TestValidator.equals("page 2 has correct limit", page2.pagination.limit, 10);
  TestValidator.equals(
    "page 2 has correct page number",
    page2.pagination.current,
    2,
  );
  // Validate that if there are more than 10 reviews, page 2 has items
  if (page2.data.length > 0) {
    // Validate reviews are sorted by creation date (newest first)
    for (let i = 0; i < page2.data.length - 1; i++) {
      TestValidator.predicate(
        `review ${i} in page 2 is newer than review ${i + 1} in page 2`,
        new Date(page2.data[i].created_at) >=
          new Date(page2.data[i + 1].created_at),
      );
    }
    // Validate no overlap between page 1 and page 2 (all review IDs should be unique)
    const page1Ids = page1.data.map((review) => review.id);
    const page2Ids = page2.data.map((review) => review.id);
    // Check that no review from page 1 appears in page 2
    for (const id of page1Ids) {
      TestValidator.predicate(
        "review ID from page 1 does not appear in page 2",
        !page2Ids.includes(id),
      );
    }
  }
  // Step 5: Test sorting by rating (highest first, descending)
  const ratingPage1 =
    await api.functional.communityPlatform.guest.products.reviews.index(
      guestConnection,
      {
        productCode,
        body: {
          page: 1,
          limit: 10,
          sort_by: "rating",
          order: "desc",
        } satisfies ICommunityPlatformProductReview.IRequest,
      },
    );
  typia.assert(ratingPage1);
  // Validate ratings are sorted highest first
  for (let i = 0; i < ratingPage1.data.length - 1; i++) {
    TestValidator.predicate(
      `rating ${i} is higher than rating ${i + 1}`,
      ratingPage1.data[i].rating >= ratingPage1.data[i + 1].rating,
    );
  }
  // Step 6: Test sorting by helpful votes (most helpful first)
  const helpfulPage1 =
    await api.functional.communityPlatform.guest.products.reviews.index(
      guestConnection,
      {
        productCode,
        body: {
          page: 1,
          limit: 10,
          sort_by: "helpful_votes",
          order: "desc",
        } satisfies ICommunityPlatformProductReview.IRequest,
      },
    );
  typia.assert(helpfulPage1);
  // Validate helpful votes are sorted highest first
  for (let i = 0; i < helpfulPage1.data.length - 1; i++) {
    TestValidator.predicate(
      `helpful votes ${i} is higher than helpful votes ${i + 1}`,
      helpfulPage1.data[i].helpful_count >=
        helpfulPage1.data[i + 1].helpful_count,
    );
  }
  // Step 7: Test limit parameter boundaries (min=1, max=100)
  const limitMin =
    await api.functional.communityPlatform.guest.products.reviews.index(
      guestConnection,
      {
        productCode,
        body: {
          page: 1,
          limit: 1,
          sort_by: "created_at",
          order: "desc",
        } satisfies ICommunityPlatformProductReview.IRequest,
      },
    );
  typia.assert(limitMin);
  TestValidator.equals("limit min returns 1 item", limitMin.data.length, 1);
  const limitMax =
    await api.functional.communityPlatform.guest.products.reviews.index(
      guestConnection,
      {
        productCode,
        body: {
          page: 1,
          limit: 100,
          sort_by: "created_at",
          order: "desc",
        } satisfies ICommunityPlatformProductReview.IRequest,
      },
    );
  typia.assert(limitMax);
  TestValidator.predicate(
    "limit max returns at least 1 item",
    limitMax.data.length > 0,
  );
  // Step 8: Test default sort_by and order
  const defaultSort =
    await api.functional.communityPlatform.guest.products.reviews.index(
      guestConnection,
      {
        productCode,
        body: {
          page: 1,
          limit: 5,
          // No sort_by or order specified - should default to created_at desc
        } satisfies ICommunityPlatformProductReview.IRequest,
      },
    );
  typia.assert(defaultSort);
  // Validate default sort is created_at desc (if at least 2 reviews exist)
  if (defaultSort.data.length >= 2) {
    for (let i = 0; i < defaultSort.data.length - 1; i++) {
      TestValidator.predicate(
        `default sort - review ${i} is newer than review ${i + 1}`,
        new Date(defaultSort.data[i].created_at) >=
          new Date(defaultSort.data[i + 1].created_at),
      );
    }
  }
  // Step 9: Test page size validation (limit>100 should be capped at 100)
  const limitOverMax =
    await api.functional.communityPlatform.guest.products.reviews.index(
      guestConnection,
      {
        productCode,
        body: {
          page: 1,
          limit: 101,
          sort_by: "created_at",
          order: "desc",
        } satisfies ICommunityPlatformProductReview.IRequest,
      },
    );
  typia.assert(limitOverMax);
  TestValidator.equals(
    "limit over max is capped",
    limitOverMax.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "limit over max returns results",
    limitOverMax.data.length > 0,
  );
}
