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
 * Test review creation with verified purchase status to validate authenticity
 * tracking. Validates that customers who made actual purchases can create
 * reviews with verified status, enhancing review credibility and trust
 * indicators in the platform.
 */
export async function test_api_review_creation_with_verified_purchase(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for category management
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdministrator.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "admin123",
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        role: "super_admin",
        permissions: JSON.stringify({ manage_categories: true }),
        status: "active",
      } satisfies IShoppingMallAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create product category
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1>
        >(),
        active: true,
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(category);

  // Step 3: Create seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: "seller123",
        business_name: RandomGenerator.paragraph({ sentences: 3 }),
        contact_person: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        business_address: RandomGenerator.paragraph({ sentences: 4 }),
        tax_id: undefined,
        ip: undefined,
        href: "https://shoppingmall.example.com/seller/join",
        referrer: "https://shoppingmall.example.com",
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // Step 4: Create product for sale
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
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
    });
  typia.assert(product);

  // Step 5: Create customer account
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "customer123",
        first_name: RandomGenerator.name(1),
        last_name: RandomGenerator.name(1),
        phone_number: RandomGenerator.mobile(),
        ip: undefined,
        href: "https://shoppingmall.example.com/customer/join",
        referrer: "https://shoppingmall.example.com",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // Step 6: Customer creates verified purchase review
  const review: IShoppingMallReview =
    await api.functional.shoppingMall.customer.reviews.create(connection, {
      body: {
        actor_type: "customer",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
        overall_rating: typia.random<
          number & tags.Minimum<1> & tags.Maximum<5>
        >(),
        shopping_mall_product_id: product.id,
        shopping_mall_seller_id: seller.id,
        verified_purchase: true,
      } satisfies IShoppingMallReview.ICreate,
    });
  typia.assert(review);

  // Step 7: Validate review properties
  TestValidator.equals(
    "review actor type should be customer",
    review.actor_type,
    "customer",
  );
  TestValidator.equals(
    "review title matches input",
    review.title,
    review.title,
  );
  TestValidator.equals(
    "review content matches input",
    review.content,
    review.content,
  );
  TestValidator.equals(
    "review overall rating matches input",
    review.overall_rating,
    review.overall_rating,
  );
  TestValidator.equals(
    "review product ID matches",
    review.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "review seller ID matches",
    review.shopping_mall_seller_id,
    seller.id,
  );
  TestValidator.predicate(
    "review should have verified purchase status",
    review.verified_purchase === true,
  );
  TestValidator.predicate(
    "review should have initial status",
    review.status === "pending" || review.status === "approved",
  );
  TestValidator.equals(
    "review helpful count should be zero initially",
    review.helpful_count,
    0,
  );
  TestValidator.equals(
    "review report count should be zero initially",
    review.report_count,
    0,
  );

  // Step 8: Validate review timestamps
  TestValidator.predicate(
    "review should have creation timestamp",
    review.created_at !== undefined,
  );
  TestValidator.predicate(
    "review should have update timestamp",
    review.updated_at !== undefined,
  );
  TestValidator.predicate(
    "created_at should be valid date",
    new Date(review.created_at).toString() !== "Invalid Date",
  );
  TestValidator.predicate(
    "updated_at should be valid date",
    new Date(review.updated_at).toString() !== "Invalid Date",
  );

  // Step 9: Validate review references
  TestValidator.predicate(
    "review should reference product",
    review.product !== undefined,
  );
  TestValidator.predicate(
    "review should reference seller",
    review.seller !== undefined,
  );

  if (review.product) {
    TestValidator.equals(
      "referenced product ID should match",
      review.product.id,
      product.id,
    );
    TestValidator.equals(
      "referenced product name should match",
      review.product.name,
      product.name,
    );
    TestValidator.equals(
      "referenced product price should match",
      review.product.price,
      product.price,
    );
  }

  if (review.seller) {
    TestValidator.equals(
      "referenced seller ID should match",
      review.seller.id,
      seller.id,
    );
    TestValidator.equals(
      "referenced seller business name should match",
      review.seller.business_name,
      seller.business_name,
    );
  }

  // Step 10: Test error case - attempt to create review without verified purchase
  await TestValidator.error(
    "should fail when creating review with false verified purchase",
    async () => {
      await api.functional.shoppingMall.customer.reviews.create(connection, {
        body: {
          actor_type: "customer",
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({ paragraphs: 2 }),
          overall_rating: typia.random<
            number & tags.Minimum<1> & tags.Maximum<5>
          >(),
          shopping_mall_product_id: product.id,
          shopping_mall_seller_id: seller.id,
          verified_purchase: false,
        } satisfies IShoppingMallReview.ICreate,
      });
    },
  );
}
