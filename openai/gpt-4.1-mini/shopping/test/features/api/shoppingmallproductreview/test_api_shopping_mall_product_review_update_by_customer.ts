import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingMallCategory";

export async function test_api_shopping_mall_product_review_update_by_customer(
  connection: api.IConnection,
) {
  // 1. Customer registration and authentication
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "1234",
        href: "https://example.com/signup",
        referrer: "https://example.com",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // 2. Seller registration and authentication
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: "1234",
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // Switch to seller for product creation
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: "1234",
      ip: null,
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies IShoppingMallSeller.ILogin,
  });

  // 3. Create a product
  // Note: Since category_code is required but we have no category creation or listing,
  // we must use a plausible random string for category_code (must comply string type)
  const productCode = RandomGenerator.alphaNumeric(10);
  const productTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const categoryCode = RandomGenerator.alphaNumeric(6);
  const productDescription = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 5,
    sentenceMax: 10,
    wordMin: 4,
    wordMax: 8,
  });
  const productBrand = RandomGenerator.name(2);
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.shoppingMallProducts.create(
      connection,
      {
        body: {
          code: productCode,
          title: productTitle,
          description: productDescription,
          brand: productBrand,
          category_code: categoryCode,
        } satisfies IShoppingMallProduct.ICreate,
      },
    );
  typia.assert(product);

  // Switch to customer login to create and update review
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: "1234",
      ip: null,
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  // 4. Create a product review by the customer
  const initialRating = typia.random<number & tags.Type<"int32">>();
  const initialTitle = RandomGenerator.paragraph({ sentences: 4 });
  const initialBody = RandomGenerator.content({ paragraphs: 2 });
  // moderation_status must be one of "pending" | "approved" | "rejected"
  const initialModStatus = "pending" as const;

  const review: IShoppingMallProductReview =
    await api.functional.shoppingMall.customer.shoppingMallProductReviews.create(
      connection,
      {
        body: {
          shopping_mall_product_id: product.id,
          rating: initialRating,
          title: initialTitle,
          body: initialBody,
          moderation_status: initialModStatus,
        } satisfies IShoppingMallProductReview.ICreate,
      },
    );
  typia.assert(review);

  // 5. Update the product review's rating, title, body, and moderation_status
  const updatedRating = Math.min(Math.max(initialRating + 1, 1), 5); // Ensure rating between 1 and 5
  const updatedTitle = RandomGenerator.paragraph({ sentences: 5 });
  const updatedBody = RandomGenerator.content({ paragraphs: 3 });
  const updatedModStatus = "approved" as const;
  const updatedAt = new Date().toISOString();

  const updatedReview: IShoppingMallProductReview =
    await api.functional.shoppingMall.customer.shoppingMallProductReviews.update(
      connection,
      {
        shoppingMallProductReviewId: review.id,
        body: {
          rating: updatedRating,
          title: updatedTitle,
          body: updatedBody,
          moderation_status: updatedModStatus,
          updated_at: updatedAt,
        } satisfies IShoppingMallProductReview.IUpdate,
      },
    );
  typia.assert(updatedReview);

  // 6. Validate that the fields are updated correctly
  TestValidator.equals(
    "updated review rating",
    updatedReview.rating,
    updatedRating,
  );
  TestValidator.equals(
    "updated review title",
    updatedReview.title,
    updatedTitle,
  );
  TestValidator.equals("updated review body", updatedReview.body, updatedBody);
  TestValidator.equals(
    "updated review moderation status",
    updatedReview.moderation_status,
    updatedModStatus,
  );
  TestValidator.predicate(
    "updated_at timestamp is ISO string",
    typeof updatedReview.updated_at === "string" &&
      updatedReview.updated_at.length > 0,
  );

  // 7. Try to update by unauthorized (seller) - expect error
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: "1234",
      ip: null,
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies IShoppingMallSeller.ILogin,
  });

  await TestValidator.error(
    "update review by unauthorized seller should fail",
    async () => {
      await api.functional.shoppingMall.customer.shoppingMallProductReviews.update(
        connection,
        {
          shoppingMallProductReviewId: review.id,
          body: {
            rating: updatedRating,
            title: "Malicious update",
            body: "Trying to update review by unauthorized user",
            moderation_status: "rejected",
            updated_at: new Date().toISOString(),
          } satisfies IShoppingMallProductReview.IUpdate,
        },
      );
    },
  );

  // Switch back to customer
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: "1234",
      ip: null,
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  // Confirm that review still unchanged from malicious attempt
  const reviewAfterAttack: IShoppingMallProductReview =
    await api.functional.shoppingMall.customer.shoppingMallProductReviews.update(
      connection,
      {
        shoppingMallProductReviewId: review.id,
        body: {
          rating: updatedRating,
          title: updatedTitle,
          body: updatedBody,
          moderation_status: updatedModStatus,
          updated_at: updatedAt,
        } satisfies IShoppingMallProductReview.IUpdate,
      },
    );
  typia.assert(reviewAfterAttack);
  TestValidator.equals(
    "review unchanged after unauthorized update",
    reviewAfterAttack,
    updatedReview,
  );
}
