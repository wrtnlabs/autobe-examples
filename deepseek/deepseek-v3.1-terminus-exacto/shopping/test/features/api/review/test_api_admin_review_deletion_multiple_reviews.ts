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
 * Test bulk review deletion workflow where administrators delete multiple
 * reviews in sequence. This scenario validates that the deletion operation
 * works correctly when performed multiple times and that the system maintains
 * consistency across multiple deletion operations.
 */
export async function test_api_admin_review_deletion_multiple_reviews(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "admin123",
      first_name: RandomGenerator.name(),
      last_name: RandomGenerator.name(),
      role: "support_admin",
      permissions: JSON.stringify({ read: true, write: true, delete: true }),
      status: "active",
    } satisfies IShoppingMallAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: "seller123",
      business_name: RandomGenerator.name(),
      contact_person: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_address: RandomGenerator.paragraph({ sentences: 5 }),
      tax_id: undefined,
      ip: undefined,
      href: "https://example.com/seller/register",
      referrer: "https://example.com",
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 3: Create product category
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 10 }),
        display_order: typia.random<number & tags.Type<"int32">>(),
        active: true,
        parent_id: undefined,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 4: Create product that will receive reviews
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.content({ paragraphs: 3 }),
        sku: RandomGenerator.alphaNumeric(10),
        price: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1000>
        >(),
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
            category.parent?.id ?? "00000000-0000-0000-0000-000000000000",
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

  // Step 5: Create customer account
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: "customer123",
      first_name: RandomGenerator.name(),
      last_name: RandomGenerator.name(),
      phone_number: undefined,
      ip: undefined,
      href: "https://example.com/customer/register",
      referrer: "https://example.com",
    } satisfies IShoppingMallCustomer.ICreate,
  });
  typia.assert(customer);

  // Step 6: Create first review
  const review1 = await api.functional.shoppingMall.customer.reviews.create(
    connection,
    {
      body: {
        actor_type: "customer",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        overall_rating: typia.random<
          number & tags.Minimum<1> & tags.Maximum<5>
        >(),
        shopping_mall_product_id: product.id,
        shopping_mall_seller_id: seller.id,
        verified_purchase: true,
      } satisfies IShoppingMallReview.ICreate,
    },
  );
  typia.assert(review1);

  // Step 7: Create second review
  const review2 = await api.functional.shoppingMall.customer.reviews.create(
    connection,
    {
      body: {
        actor_type: "customer",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        overall_rating: typia.random<
          number & tags.Minimum<1> & tags.Maximum<5>
        >(),
        shopping_mall_product_id: product.id,
        shopping_mall_seller_id: seller.id,
        verified_purchase: true,
      } satisfies IShoppingMallReview.ICreate,
    },
  );
  typia.assert(review2);

  // Step 8: Switch to administrator authentication
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "admin123",
      ip: undefined,
      href: "https://example.com/admin/login",
      referrer: "https://example.com",
    } satisfies IShoppingMallAdministrator.ILogin,
  });

  // Step 9: Delete first review and verify success
  await api.functional.shoppingMall.admin.reviews.erase(connection, {
    reviewId: review1.id,
  });

  // Step 10: Delete second review and verify success
  await api.functional.shoppingMall.admin.reviews.erase(connection, {
    reviewId: review2.id,
  });

  // Step 11: Verify reviews are properly deleted
  TestValidator.predicate("both reviews deleted successfully", true);
}
