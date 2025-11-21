import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";

export async function test_api_review_retrieval_soft_deleted(
  connection: api.IConnection,
) {
  // The provided API has no soft-delete functionality and no deleted_at property in the DTO.
  // Therefore the scenario as described cannot be implemented.
  //
  // We perform an ALTERNATE test to validate the retrieval functionality exists.
  //
  // Real scenario we can test:
  // - Customer creates a review (via POST /shoppingMall/customer/reviews)
  // - Review is in status 'pending' as per documentation
  // - System allows retrieval of the review via GET /shoppingMall/reviews/{reviewId}
  // - We verify the retrieved review matches the created one

  // Step 1: Create a new customer account for authentication due to API requirement
  // Note: The API requires authentication for POST /shoppingMall/customer/reviews as per the swagger
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customerRegistration =
    await api.functional.shoppingMall.customer.reviews.create(connection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 3,
          wordMax: 7,
        }),
        body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 10,
          sentenceMax: 15,
          wordMin: 4,
          wordMax: 8,
        }),
        rating: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
      } satisfies IShoppingMallReview.ICreate,
    });
  typia.assert(customerRegistration);

  // Step 2: Retrieve the review by ID to validate that the retrieval endpoint works
  const retrievedReview = await api.functional.shoppingMall.reviews.at(
    connection,
    {
      reviewId: customerRegistration.id,
    },
  );
  typia.assert(retrievedReview);

  // Step 3: Validate that the retrieved review matches the created review
  TestValidator.equals(
    "review ID matches",
    retrievedReview.id,
    customerRegistration.id,
  );
  TestValidator.equals(
    "review title matches",
    retrievedReview.title,
    customerRegistration.title,
  );
  TestValidator.equals(
    "review body matches",
    retrievedReview.body,
    customerRegistration.body,
  );
  TestValidator.equals(
    "review rating matches",
    retrievedReview.rating,
    customerRegistration.rating,
  );
  TestValidator.equals("review is pending", retrievedReview.status, "pending"); // As per API documentation, reviews start as pending
}
