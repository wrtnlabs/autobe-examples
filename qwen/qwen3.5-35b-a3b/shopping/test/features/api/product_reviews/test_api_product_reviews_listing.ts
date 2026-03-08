import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_product_reviews_listing(
  connection: api.IConnection,
): Promise<void> {
  // Generate test product ID
  const productId = typia.random<string & tags.Format<"uuid">>();
  // Create mock customers and reviews data
  const mockCustomerProfiles: IEcommerceMallCustomerProfile.ISummary[] = [
    {
      displayName: RandomGenerator.name(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      displayName: RandomGenerator.name(),
      phoneNumber: RandomGenerator.mobile(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      displayName: "deleted user", // Simulate deleted customer
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      displayName: RandomGenerator.name(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      displayName: RandomGenerator.name(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
  // Create mock customer summaries
  const mockCustomers: IEcommerceMallCustomer.ISummary[] =
    mockCustomerProfiles.map((profile, index) => ({
      id: typia.random<string & tags.Format<"uuid">>(),
      email: typia.random<string & tags.Format<"email">>(),
      isBanned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: index === 2 ? new Date().toISOString() : null, // Third customer is deleted
      customerProfile: profile,
    }));
  // Create mock product summary
  const mockProduct: IEcommerceMallProduct.ISummary = {
    id: productId,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    base_price: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<1000>
    >(),
    is_active: true,
    created_at: new Date().toISOString(),
    seller: {
      id: typia.random<string & tags.Format<"uuid">>(),
      email: typia.random<string & tags.Format<"email">>(),
      approval_status: "approved",
      is_suspended: false,
      is_banned: false,
      created_at: new Date().toISOString(),
    },
    category: {
      id: typia.random<string & tags.Format<"uuid">>(),
      name: RandomGenerator.name(2),
      is_leaf: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    },
  };
  // Create mock reviews (6 reviews for this product)
  const mockReviews: IEcommerceMallReview.ISummary[] = ArrayUtil.repeat(
    6,
    (index: number) => ({
      id: typia.random<string & tags.Format<"uuid">>(),
      rating: (index % 5) + 1, // Ratings from 1 to 5
      textContent:
        index % 2 === 0 ? RandomGenerator.paragraph({ sentences: 3 }) : null,
      customer: mockCustomers[index],
      product: mockProduct,
      isActive: true,
      createdAt: new Date(Date.now() - index * 3600000 * 2).toISOString(), // 2 hours apart
      updatedAt: new Date(Date.now() - index * 3600000 * 2).toISOString(),
      deletedAt: null,
    }),
  );
  // Test 1: Retrieve reviews with default pagination (page 1, default pageSize)
  const firstPageResponse =
    await api.functional.ecommerceMall.products.reviews.index(connection, {
      productId,
      body: {
        page: 1,
        pageSize: 20,
        sortBy: "createdAt",
        sortOrder: "desc",
      } satisfies IEcommerceMallReview.IRequest,
    });
  typia.assert(firstPageResponse);
  // Validate response structure
  TestValidator.equals(
    "response has pagination",
    firstPageResponse.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "response has data array",
    Array.isArray(firstPageResponse.data),
    true,
  );
  // Validate pagination metadata
  TestValidator.equals(
    "current page is 1",
    firstPageResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "page limit is 20",
    firstPageResponse.pagination.limit,
    20,
  );
  TestValidator.equals(
    "total records is 6",
    firstPageResponse.pagination.records,
    6,
  );
  TestValidator.equals(
    "total pages is 1",
    firstPageResponse.pagination.pages,
    1,
  );
  // Validate review count
  TestValidator.equals("review count is 6", firstPageResponse.data.length, 6);
  // Validate each review in the response
  for (const review of firstPageResponse.data) {
    typia.assert(review);
    // Validate rating range (1-5)
    TestValidator.predicate(
      `rating for review ${review.id} is valid`,
      review.rating >= 1 && review.rating <= 5,
    );
    // Validate textContent is either string or null
    if (review.textContent !== null && review.textContent !== undefined) {
      TestValidator.equals(
        `textContent type for review ${review.id}`,
        typeof review.textContent,
        "string",
      );
    }
    // Validate customer has required fields
    TestValidator.equals(
      `customer has id for review ${review.id}`,
      review.customer.id !== undefined,
      true,
    );
    TestValidator.equals(
      `customer has email for review ${review.id}`,
      review.customer.email !== undefined,
      true,
    );
    TestValidator.equals(
      `customer has profile for review ${review.id}`,
      review.customer.customerProfile !== undefined,
      true,
    );
    // Validate customer display name
    TestValidator.equals(
      `customer has displayName for review ${review.id}`,
      review.customer.customerProfile.displayName !== undefined,
      true,
    );
    // Validate product reference
    TestValidator.equals(
      `product has id for review ${review.id}`,
      review.product.id === productId,
      true,
    );
    // Validate is_active is boolean
    TestValidator.equals(
      `isActive is boolean for review ${review.id}`,
      typeof review.isActive === "boolean",
      true,
    );
    // Validate createdAt is valid date-time
    TestValidator.predicate(
      `createdAt is valid date-time for review ${review.id}`,
      !isNaN(Date.parse(review.createdAt)),
    );
    // Validate deletedAt is null or date-time
    if (review.deletedAt !== null) {
      TestValidator.predicate(
        `deletedAt is valid date-time for review ${review.id}`,
        !isNaN(Date.parse(review.deletedAt)),
      );
    }
  }
  // Validate sorting (reviews should be sorted by createdAt descending)
  const sortedReviews = [...firstPageResponse.data].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  TestValidator.index(
    "reviews are sorted by createdAt descending",
    sortedReviews,
    firstPageResponse.data,
  );
  // Test 2: Test with smaller page size (3 reviews per page)
  const secondPageResponse =
    await api.functional.ecommerceMall.products.reviews.index(connection, {
      productId,
      body: {
        page: 2,
        pageSize: 3,
        sortBy: "createdAt",
        sortOrder: "desc",
      } satisfies IEcommerceMallReview.IRequest,
    });
  typia.assert(secondPageResponse);
  TestValidator.equals(
    "second page current",
    secondPageResponse.pagination.current,
    2,
  );
  TestValidator.equals(
    "second page limit",
    secondPageResponse.pagination.limit,
    3,
  );
  TestValidator.equals(
    "second page records",
    secondPageResponse.pagination.records,
    6,
  );
  TestValidator.equals(
    "second page pages",
    secondPageResponse.pagination.pages,
    2,
  );
  TestValidator.equals(
    "second page has 2 reviews",
    secondPageResponse.data.length,
    2,
  );
  // Test 3: Test with rating filter (ratingMin and ratingMax)
  const filteredReviewsResponse =
    await api.functional.ecommerceMall.products.reviews.index(connection, {
      productId,
      body: {
        ratingMin: 4,
        ratingMax: 5,
        page: 1,
        pageSize: 100,
      } satisfies IEcommerceMallReview.IRequest,
    });
  typia.assert(filteredReviewsResponse);
  TestValidator.equals(
    "filtered reviews count",
    filteredReviewsResponse.data.length,
    2,
  ); // Only 2 reviews with rating 4 or 5
  for (const review of filteredReviewsResponse.data) {
    TestValidator.predicate(
      `filtered review ${review.id} has valid rating`,
      review.rating >= 4 && review.rating <= 5,
    );
  }
  // Test 4: Test with sorting by rating ascending
  const ratingAscResponse =
    await api.functional.ecommerceMall.products.reviews.index(connection, {
      productId,
      body: {
        sortBy: "rating",
        sortOrder: "asc",
        page: 1,
        pageSize: 100,
      } satisfies IEcommerceMallReview.IRequest,
    });
  typia.assert(ratingAscResponse);
  // Validate reviews are sorted by rating ascending
  const isSortedAscending = ratingAscResponse.data.every(
    (review, index, array) => {
      if (index === 0) return true;
      return review.rating >= array[index - 1].rating;
    },
  );
  TestValidator.predicate(
    "reviews sorted by rating ascending",
    isSortedAscending,
  );
  // Test 5: Test with sorting by rating descending
  const ratingDescResponse =
    await api.functional.ecommerceMall.products.reviews.index(connection, {
      productId,
      body: {
        sortBy: "rating",
        sortOrder: "desc",
        page: 1,
        pageSize: 100,
      } satisfies IEcommerceMallReview.IRequest,
    });
  typia.assert(ratingDescResponse);
  // Validate reviews are sorted by rating descending
  const isSortedDescending = ratingDescResponse.data.every(
    (review, index, array) => {
      if (index === 0) return true;
      return review.rating <= array[index - 1].rating;
    },
  );
  TestValidator.predicate(
    "reviews sorted by rating descending",
    isSortedDescending,
  );
  // Test 6: Test with searchText filter
  const searchText = RandomGenerator.paragraph({ sentences: 2 });
  const searchTextResponse =
    await api.functional.ecommerceMall.products.reviews.index(connection, {
      productId,
      body: {
        searchText,
        page: 1,
        pageSize: 100,
      } satisfies IEcommerceMallReview.IRequest,
    });
  typia.assert(searchTextResponse);
  // If there are matching reviews, validate textContent contains the search term
  if (searchTextResponse.data.length > 0) {
    for (const review of searchTextResponse.data) {
      if (review.textContent !== null) {
        // Note: The server might do case-insensitive matching, so we check both
        TestValidator.predicate(
          `review contains search term`,
          review.textContent.toLowerCase().includes(searchText.toLowerCase()),
        );
      }
    }
  }
  // Test 7: Test with page size limit
  const maxPageSizeResponse =
    await api.functional.ecommerceMall.products.reviews.index(connection, {
      productId,
      body: {
        page: 1,
        pageSize: 100,
      } satisfies IEcommerceMallReview.IRequest,
    });
  typia.assert(maxPageSizeResponse);
  TestValidator.equals(
    "max page size limit",
    maxPageSizeResponse.pagination.limit,
    100,
  );
  TestValidator.equals(
    "all reviews returned",
    maxPageSizeResponse.data.length,
    6,
  );
}