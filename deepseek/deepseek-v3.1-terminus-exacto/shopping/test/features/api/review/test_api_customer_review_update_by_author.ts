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
 * Validates the complete review lifecycle for customer-authored reviews.
 *
 * This test implements a comprehensive workflow that creates all necessary
 * prerequisites: customer account authentication, admin category creation,
 * seller product listing, and initial review submission. The core scenario
 * validates that customers can successfully update their own reviews with
 * modified content and ratings while maintaining data integrity.
 *
 * Key test steps:
 *
 * 1. Create customer account and authenticate
 * 2. Create admin account and authenticate for category creation
 * 3. Create seller account and authenticate for product listing
 * 4. Create product category via admin
 * 5. Create product via seller
 * 6. Create initial review via customer
 * 7. Update the review with new content and rating
 * 8. Validate that updated review reflects changes while preserving
 *    system-generated fields
 */
export async function test_api_customer_review_update_by_author(
  connection: api.IConnection,
) {
  // Step 1: Create customer account and authenticate
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: "customer123",
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      phone_number: RandomGenerator.mobile(),
      href: "https://shoppingmall.com/register",
      referrer: "https://shoppingmall.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Step 2: Create admin account and authenticate for category creation
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

  // Step 3: Create seller account and authenticate for product listing
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: "seller123",
      business_name: RandomGenerator.paragraph({ sentences: 2 }),
      contact_person: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_address: RandomGenerator.paragraph({ sentences: 3 }),
      href: "https://shoppingmall.com/seller/register",
      referrer: "https://shoppingmall.com",
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 4: Create product category via admin
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        display_order: typia.random<number & tags.Type<"int32">>(),
        active: true,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 5: Create product via seller
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        sku: RandomGenerator.alphaNumeric(10),
        price: typia.random<number & tags.Minimum<1> & tags.Maximum<1000>>(),
        stock_quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<100>
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

  // Switch back to customer authentication
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: "customer123",
      href: "https://shoppingmall.com/login",
      referrer: "https://shoppingmall.com",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  // Step 6: Create initial review via customer
  const initialReview =
    await api.functional.shoppingMall.customer.reviews.create(connection, {
      body: {
        actor_type: "customer",
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 1 }),
        overall_rating: typia.random<
          number & tags.Minimum<1> & tags.Maximum<5>
        >(),
        shopping_mall_product_id: product.id,
        shopping_mall_seller_id: seller.id,
        verified_purchase: true,
      } satisfies IShoppingMallReview.ICreate,
    });
  typia.assert(initialReview);

  // Step 7: Update the review with new content and rating
  const updatedReview =
    await api.functional.shoppingMall.customer.reviews.update(connection, {
      reviewId: initialReview.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        overall_rating: typia.random<
          number & tags.Minimum<1> & tags.Maximum<5>
        >(),
      } satisfies IShoppingMallReview.IUpdate,
    });
  typia.assert(updatedReview);

  // Step 8: Validate that updated review reflects changes while preserving system-generated fields
  TestValidator.equals(
    "review ID remains unchanged",
    updatedReview.id,
    initialReview.id,
  );
  TestValidator.equals(
    "actor_type remains unchanged",
    updatedReview.actor_type,
    initialReview.actor_type,
  );
  TestValidator.equals(
    "verified_purchase remains unchanged",
    updatedReview.verified_purchase,
    initialReview.verified_purchase,
  );
  TestValidator.equals(
    "product reference remains unchanged",
    updatedReview.shopping_mall_product_id,
    initialReview.shopping_mall_product_id,
  );
  TestValidator.equals(
    "seller reference remains unchanged",
    updatedReview.shopping_mall_seller_id,
    initialReview.shopping_mall_seller_id,
  );
  TestValidator.equals(
    "created_at timestamp remains unchanged",
    updatedReview.created_at,
    initialReview.created_at,
  );

  TestValidator.notEquals(
    "title should be updated",
    updatedReview.title,
    initialReview.title,
  );
  TestValidator.notEquals(
    "content should be updated",
    updatedReview.content,
    initialReview.content,
  );
  TestValidator.notEquals(
    "overall_rating should be updated",
    updatedReview.overall_rating,
    initialReview.overall_rating,
  );
  TestValidator.predicate(
    "updated_at should be newer than created_at",
    new Date(updatedReview.updated_at) > new Date(initialReview.created_at),
  );
}
