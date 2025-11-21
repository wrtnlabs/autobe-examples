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
 * Test review rating modification workflow where a customer updates their
 * review rating after reconsideration. This scenario validates that rating
 * constraints (1.0-5.0) are properly enforced during updates and that the
 * system handles rating changes correctly. Create a customer account,
 * authenticate, set up product infrastructure, create a review with initial
 * rating, then update to a different valid rating. Verify that the rating
 * change is reflected accurately and that the updated_at timestamp is properly
 * refreshed.
 */
export async function test_api_customer_review_update_rating_modification(
  connection: api.IConnection,
) {
  // Step 1: Create customer account
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "customer123";

  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      first_name: RandomGenerator.name(),
      last_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Step 2: Create admin account for category setup
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "admin123";

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      first_name: RandomGenerator.name(),
      last_name: RandomGenerator.name(),
      role: "support_admin",
      permissions: JSON.stringify({ read: true, write: true }),
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 3: Create seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "seller123";

  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      business_name: RandomGenerator.name(),
      contact_person: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_address: RandomGenerator.paragraph({ sentences: 3 }),
      href: "https://example.com/seller/register",
      referrer: "https://example.com",
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 4: Create category as admin
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
        active: true,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 5: Create product as seller
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(),
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

  // Step 6: Switch back to customer context and create initial review
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: "https://example.com/review",
      referrer: "https://example.com/product",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  const initialRating = typia.random<
    number & tags.Minimum<1> & tags.Maximum<5>
  >();
  const initialReview =
    await api.functional.shoppingMall.customer.reviews.create(connection, {
      body: {
        actor_type: "customer",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        overall_rating: initialRating,
        shopping_mall_product_id: product.id,
        shopping_mall_seller_id: seller.id,
        verified_purchase: true,
      } satisfies IShoppingMallReview.ICreate,
    });
  typia.assert(initialReview);

  // Step 7: Update review with modified rating
  const updatedRating = typia.random<
    number & tags.Minimum<1> & tags.Maximum<5>
  >();

  // Ensure we get a different rating for the update
  const finalRating =
    updatedRating !== initialRating
      ? updatedRating
      : updatedRating < 5
        ? updatedRating + 1
        : updatedRating - 1;

  const updatedReview =
    await api.functional.shoppingMall.customer.reviews.update(connection, {
      reviewId: initialReview.id,
      body: {
        overall_rating: finalRating,
      } satisfies IShoppingMallReview.IUpdate,
    });
  typia.assert(updatedReview);

  // Step 8: Validate rating change
  TestValidator.equals(
    "rating should be updated",
    updatedReview.overall_rating,
    finalRating,
  );

  TestValidator.notEquals(
    "updated rating should differ from initial rating",
    updatedReview.overall_rating,
    initialRating,
  );

  // Step 9: Validate timestamp update
  TestValidator.predicate(
    "updated_at timestamp should be refreshed",
    new Date(updatedReview.updated_at) > new Date(initialReview.updated_at),
  );

  // Step 10: Validate other fields remain unchanged
  TestValidator.equals(
    "review ID should remain the same",
    updatedReview.id,
    initialReview.id,
  );

  TestValidator.equals(
    "actor type should remain unchanged",
    updatedReview.actor_type,
    initialReview.actor_type,
  );

  TestValidator.equals(
    "title should remain unchanged",
    updatedReview.title,
    initialReview.title,
  );

  TestValidator.equals(
    "content should remain unchanged",
    updatedReview.content,
    initialReview.content,
  );

  TestValidator.equals(
    "verified purchase status should remain unchanged",
    updatedReview.verified_purchase,
    initialReview.verified_purchase,
  );

  // Step 11: Validate rating constraints are maintained
  TestValidator.predicate(
    "updated rating should be within valid range (1.0-5.0)",
    updatedReview.overall_rating >= 1 && updatedReview.overall_rating <= 5,
  );

  TestValidator.predicate(
    "initial rating should be within valid range (1.0-5.0)",
    initialReview.overall_rating >= 1 && initialReview.overall_rating <= 5,
  );
}
