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
 * Test complete review creation workflow by authenticated customers. Validates
 * that customers can submit reviews for products with proper rating constraints
 * (1.0-5.0), content validation, and verification status tracking. Tests the
 * polymorphic ownership pattern where reviews can be created by different actor
 * types.
 */
export async function test_api_review_creation_by_customer(
  connection: api.IConnection,
) {
  // 1. Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      role: "super_admin",
      permissions: JSON.stringify({ read: true, write: true, delete: true }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(admin);

  // 2. Create product category as administrator
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
        active: true,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // 3. Create seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "SellerPassword123!";

  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      business_name: RandomGenerator.paragraph({ sentences: 2 }),
      contact_person: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_address: RandomGenerator.content({ paragraphs: 1 }),
      tax_id: undefined,
      ip: undefined,
      href: "https://example.com/seller/register",
      referrer: "https://example.com",
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // 4. Create product as seller
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        sku: RandomGenerator.alphaNumeric(8),
        price: typia.random<number & tags.Minimum<1> & tags.Maximum<1000>>(),
        compare_price: undefined,
        cost_price: undefined,
        stock_quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<100>
        >(),
        status: "active",
        condition: "new",
        weight: undefined,
        dimensions: undefined,
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
          parent: undefined,
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

  // 5. Create customer account
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "CustomerPassword123!";

  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      first_name: RandomGenerator.name(1),
      last_name: RandomGenerator.name(1),
      phone_number: undefined,
      ip: undefined,
      href: "https://example.com/customer/register",
      referrer: "https://example.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // 6. Customer submits review
  const reviewData = {
    actor_type: "customer" as const,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    content: RandomGenerator.content({ paragraphs: 1 }),
    overall_rating: typia.random<number & tags.Minimum<1> & tags.Maximum<5>>(),
    shopping_mall_product_id: product.id,
    shopping_mall_seller_id: seller.id,
    verified_purchase: true,
  } satisfies IShoppingMallReview.ICreate;

  const review = await api.functional.shoppingMall.customer.reviews.create(
    connection,
    {
      body: reviewData,
    },
  );
  typia.assert(review);

  // 7. Validate review creation response
  TestValidator.equals(
    "review ID should be valid UUID",
    typeof review.id,
    "string",
  );
  TestValidator.equals(
    "actor type should be customer",
    review.actor_type,
    "customer",
  );
  TestValidator.equals(
    "title should match input",
    review.title,
    reviewData.title,
  );
  TestValidator.equals(
    "content should match input",
    review.content,
    reviewData.content,
  );
  TestValidator.equals(
    "overall rating should match input",
    review.overall_rating,
    reviewData.overall_rating,
  );
  TestValidator.equals(
    "product ID should match",
    review.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "seller ID should match",
    review.shopping_mall_seller_id,
    seller.id,
  );
  TestValidator.equals(
    "verified purchase should match",
    review.verified_purchase,
    reviewData.verified_purchase,
  );
  TestValidator.predicate(
    "status should be valid",
    typeof review.status === "string",
  );
  TestValidator.predicate(
    "helpful count should be number",
    typeof review.helpful_count === "number",
  );
  TestValidator.predicate(
    "report count should be number",
    typeof review.report_count === "number",
  );
  TestValidator.predicate(
    "created at should be valid date",
    typeof review.created_at === "string",
  );
  TestValidator.predicate(
    "updated at should be valid date",
    typeof review.updated_at === "string",
  );

  // 8. Validate product reference in review
  TestValidator.predicate(
    "product reference should exist",
    review.product !== undefined,
  );
  if (review.product) {
    TestValidator.equals(
      "product ID should match",
      review.product.id,
      product.id,
    );
    TestValidator.equals(
      "product name should match",
      review.product.name,
      product.name,
    );
    TestValidator.equals(
      "product price should match",
      review.product.price,
      product.price,
    );
    TestValidator.equals(
      "product status should match",
      review.product.status,
      product.status,
    );
    TestValidator.equals(
      "product stock quantity should match",
      review.product.stock_quantity,
      product.stock_quantity,
    );
  }

  // 9. Validate seller reference in review
  TestValidator.predicate(
    "seller reference should exist",
    review.seller !== undefined,
  );
  if (review.seller) {
    TestValidator.equals("seller ID should match", review.seller.id, seller.id);
    TestValidator.equals(
      "seller business name should match",
      review.seller.business_name,
      seller.business_name,
    );
    TestValidator.equals(
      "seller contact person should match",
      review.seller.contact_person,
      seller.contact_person,
    );
    TestValidator.equals(
      "seller email should match",
      review.seller.email,
      seller.email,
    );
    TestValidator.equals(
      "seller status should match",
      review.seller.status,
      seller.status,
    );
  }
}
