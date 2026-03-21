import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_review_list_filter_by_product_and_content(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Get all reviews for this customer first to understand what exists
  const allReviewsResponse =
    await api.functional.ecommerceMall.customer.customers.reviews.index(
      customerConnection,
      {
        body: {} satisfies IEcommerceMallReview.IRequest,
      },
    );
  typia.assert(allReviewsResponse);
  // 3. Find reviews with content to use as reference
  const reviewsWithContent = allReviewsResponse.data.filter(
    (review) => review.content !== null && review.content !== undefined,
  );
  if (reviewsWithContent.length === 0) {
    // No reviews with content available, create a test scenario with existing data
    // Test filtering with productId only (hasContent=false should return all for product)
    const anyReview = allReviewsResponse.data[0];
    if (anyReview) {
      const filteredByProduct =
        await api.functional.ecommerceMall.customer.customers.reviews.index(
          customerConnection,
          {
            body: {
              productId: anyReview.product.id,
              hasContent: false,
            } satisfies IEcommerceMallReview.IRequest,
          },
        );
      typia.assert(filteredByProduct);
      // Verify all returned reviews belong to the specified product
      for (const review of filteredByProduct.data) {
        TestValidator.equals(
          "review belongs to product",
          review.product.id,
          anyReview.product.id,
        );
      }
    }
    return;
  }
  // 4. Use the first review with content as our reference
  const referenceReview = reviewsWithContent[0];
  const targetProductId = referenceReview.product.id;
  // 5. Test filtering by productId with hasContent=true
  // This should return only reviews that belong to the target product AND have content
  const filteredReviews =
    await api.functional.ecommerceMall.customer.customers.reviews.index(
      customerConnection,
      {
        body: {
          productId: targetProductId,
          hasContent: true,
          sortBy: "rating_high",
        } satisfies IEcommerceMallReview.IRequest,
      },
    );
  typia.assert(filteredReviews);
  // 6. Verify all returned reviews belong to the specified product
  for (const review of filteredReviews.data) {
    TestValidator.equals(
      "review belongs to target product",
      review.product.id,
      targetProductId,
    );
  }
  // 7. Verify all returned reviews have non-null text content
  for (const review of filteredReviews.data) {
    TestValidator.predicate(
      "review has content text",
      review.content !== null &&
        review.content !== undefined &&
        review.content.length > 0,
    );
  }
  // 8. Verify reviews are sorted by rating_high (descending)
  if (filteredReviews.data.length > 1) {
    for (let i = 0; i < filteredReviews.data.length - 1; i++) {
      const current = filteredReviews.data[i];
      const next = filteredReviews.data[i + 1];
      TestValidator.predicate(
        "reviews sorted by rating high to low",
        current.rating >= next.rating,
      );
    }
  }
  // 9. Test hasContent=false to compare (should return more results including rating-only reviews)
  const allProductReviews =
    await api.functional.ecommerceMall.customer.customers.reviews.index(
      customerConnection,
      {
        body: {
          productId: targetProductId,
          hasContent: false,
        } satisfies IEcommerceMallReview.IRequest,
      },
    );
  typia.assert(allProductReviews);
  // hasContent=false should return >= results than hasContent=true
  TestValidator.predicate(
    "hasContent=false returns at least as many reviews as hasContent=true",
    allProductReviews.data.length >= filteredReviews.data.length,
  );
}
