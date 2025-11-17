import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingMallCategory";

export async function test_api_shopping_mall_product_review_deletion_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Register a new admin user
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "password123",
        href: "https://example.com/admin/join",
        referrer: "https://example.com",
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // Step 2: Login as the admin user to ensure authentication context
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "password123",
      href: "https://example.com/admin/login",
      referrer: "https://example.com",
    } satisfies IShoppingMallAdmin.ILogin,
  });

  // Step 3: Register a new seller user
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: "password123",
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // Step 4: Login as the seller user for authenticated product creation
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: "password123",
      href: "https://example.com/seller/login",
      referrer: "https://example.com",
    } satisfies IShoppingMallSeller.ILogin,
  });

  // Step 5: Create a new product by the seller
  const productCode = RandomGenerator.alphaNumeric(10);
  // Using a fake but valid category_code since no creation category API is given.
  // The test assumes existence of category code 'DEFAULT_CAT_CODE' for the test.
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.shoppingMallProducts.create(
      connection,
      {
        body: {
          code: productCode,
          title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 5,
            wordMax: 10,
          }),
          description: RandomGenerator.content({ paragraphs: 2 }),
          brand: RandomGenerator.name(1),
          category_code: "DEFAULT_CAT_CODE",
        } satisfies IShoppingMallProduct.ICreate,
      },
    );
  typia.assert(product);

  // Step 6: Register a new customer user
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "password123",
        href: "https://example.com/customer/join",
        referrer: "https://example.com",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // Step 7: Login as the customer user for authenticated review creation
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: "password123",
      href: "https://example.com/customer/login",
      referrer: "https://example.com",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  // Step 8: Create a product review by the customer for the created product
  const review: IShoppingMallProductReview =
    await api.functional.shoppingMall.customer.shoppingMallProductReviews.create(
      connection,
      {
        body: {
          shopping_mall_product_id: product.id,
          rating: 5,
          title: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 6,
            wordMax: 12,
          }),
          body: RandomGenerator.content({ paragraphs: 1 }),
          moderation_status: "pending",
        } satisfies IShoppingMallProductReview.ICreate,
      },
    );
  typia.assert(review);

  // Step 9: Switch back to admin user to delete the created product review
  // Login to refresh admin authentication context
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "password123",
      href: "https://example.com/admin/login",
      referrer: "https://example.com",
    } satisfies IShoppingMallAdmin.ILogin,
  });

  // Step 10: Call delete API to erase the product review
  await api.functional.shoppingMall.admin.shoppingMallProductReviews.erase(
    connection,
    {
      shoppingMallProductReviewId: review.id,
    },
  );

  // No return from delete, so test simply asserts success without error
}
