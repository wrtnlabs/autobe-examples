import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test public retrieval of approved reviews without authentication.
 *
 * This E2E test validates that approved reviews can be accessed publicly
 * without requiring authentication. The test follows a comprehensive business
 * workflow involving multiple actors: administrator for category management,
 * seller for product listing, and customer for review submission.
 *
 * The test validates that review content, ratings, and engagement metrics are
 * properly displayed to all users. Since the API doesn't provide direct control
 * over review statuses, this test focuses on validating the actual behavior of
 * the review retrieval system with the created reviews.
 */
export async function test_api_review_public_retrieval(
  connection: api.IConnection,
) {
  // 1. Create administrator account for category management
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "admin123",
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role: "support_admin",
      permissions: JSON.stringify({ manage_categories: true }),
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(admin);

  // 2. Create seller account for product listing
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: "seller123",
      business_name: RandomGenerator.paragraph({ sentences: 2 }),
      contact_person: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_address: RandomGenerator.paragraph({ sentences: 3 }),
      href: "https://example.com/seller/join",
      referrer: "https://example.com/seller/signup",
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // 3. Create customer account for review submission
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: "customer123",
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      phone_number: RandomGenerator.mobile(),
      href: "https://example.com/customer/join",
      referrer: "https://example.com/customer/signup",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // 4. Create product category
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1>
        >(),
        active: true,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // 5. Create product that will be reviewed
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        sku: RandomGenerator.alphaNumeric(8),
        price: typia.random<number & tags.Minimum<1> & tags.Maximum<1000>>(),
        stock_quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<1000>
        >(),
        status: "active",
        condition: "new",
        category: {
          id: category.id,
          name: category.name,
          description: category.description,
          display_order: category.display_order,
          active: category.active,
          parent_id:
            category.parent?.id ?? typia.random<string & tags.Format<"uuid">>(),
          created_at: category.created_at,
          updated_at: category.updated_at,
          parent: category.parent,
        } satisfies IShoppingMallCategory.ISummary,
        seller: {
          id: seller.id,
          business_name: seller.business_name,
          contact_person: seller.contact_person,
          email: seller.email,
          status: seller.status,
        } satisfies IShoppingMallSeller.ISummary,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // 6. Create review for testing
  const review = await api.functional.shoppingMall.customer.reviews.create(
    connection,
    {
      body: {
        actor_type: "customer" as const,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 1 }),
        overall_rating: typia.random<
          number & tags.Minimum<1> & tags.Maximum<5>
        >(),
        shopping_mall_product_id: product.id,
        shopping_mall_seller_id: seller.id,
        verified_purchase: true,
      } satisfies IShoppingMallReview.ICreate,
    },
  );
  typia.assert(review);

  // 7. Test public retrieval without authentication
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Review should be publicly accessible (assuming default status allows public access)
  const retrievedReview = await api.functional.shoppingMall.reviews.at(
    unauthConn,
    {
      reviewId: review.id,
    },
  );
  typia.assert(retrievedReview);

  // Validate that review content is properly displayed
  TestValidator.equals(
    "review title matches",
    retrievedReview.title,
    review.title,
  );
  TestValidator.equals(
    "review content matches",
    retrievedReview.content,
    review.content,
  );
  TestValidator.equals(
    "review rating matches",
    retrievedReview.overall_rating,
    review.overall_rating,
  );
  TestValidator.equals(
    "review product ID matches",
    retrievedReview.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "review seller ID matches",
    retrievedReview.shopping_mall_seller_id,
    seller.id,
  );

  // Test that engagement metrics are properly displayed
  TestValidator.predicate(
    "helpful count is non-negative",
    retrievedReview.helpful_count >= 0,
  );
  TestValidator.predicate(
    "report count is non-negative",
    retrievedReview.report_count >= 0,
  );

  // Validate review has valid creation timestamp
  TestValidator.predicate(
    "review has valid creation timestamp",
    retrievedReview.created_at !== null &&
      retrievedReview.created_at !== undefined,
  );

  // Test that review references are properly populated
  TestValidator.predicate(
    "review has product reference",
    retrievedReview.product !== undefined,
  );
  TestValidator.predicate(
    "review has seller reference",
    retrievedReview.seller !== undefined,
  );

  if (retrievedReview.product) {
    TestValidator.equals(
      "product ID matches",
      retrievedReview.product.id,
      product.id,
    );
    TestValidator.equals(
      "product name matches",
      retrievedReview.product.name,
      product.name,
    );
  }

  if (retrievedReview.seller) {
    TestValidator.equals(
      "seller ID matches",
      retrievedReview.seller.id,
      seller.id,
    );
    TestValidator.equals(
      "seller business name matches",
      retrievedReview.seller.business_name,
      seller.business_name,
    );
  }

  // Test that the review can be retrieved with authentication as well
  const authRetrievedReview = await api.functional.shoppingMall.reviews.at(
    connection,
    {
      reviewId: review.id,
    },
  );
  typia.assert(authRetrievedReview);
  TestValidator.equals(
    "authenticated retrieval matches public retrieval",
    authRetrievedReview.id,
    retrievedReview.id,
  );
}
