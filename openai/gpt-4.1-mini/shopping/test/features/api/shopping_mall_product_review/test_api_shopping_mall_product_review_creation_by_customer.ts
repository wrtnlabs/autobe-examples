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

export async function test_api_shopping_mall_product_review_creation_by_customer(
  connection: api.IConnection,
) {
  // Register a new seller user
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerCreateBody = {
    email: sellerEmail,
    password: "1234",
  } satisfies IShoppingMallSeller.ICreate;
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerCreateBody,
    });
  typia.assert(seller);

  // Authenticate as seller
  const sellerLoginBody = {
    email: sellerEmail,
    password: "1234",
    ip: undefined,
    href: "http://localhost/",
    referrer: "http://localhost/",
  } satisfies IShoppingMallSeller.ILogin;
  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerAuth);

  // Create a category code for the product (as a random string, because the category code is required and we don't have API for category creation in scope)
  const categoryCode = "default-category";

  // Create a product with the category code
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(10),
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    brand: RandomGenerator.name(1),
    category_code: categoryCode,
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.shoppingMallProducts.create(
      connection,
      { body: productCreateBody },
    );
  typia.assert(product);

  // Register a new customer user
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerCreateBody = {
    email: customerEmail,
    password: "1234",
    href: "http://localhost/customer",
    referrer: "http://localhost/",
  } satisfies IShoppingMallCustomer.ICreate;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerCreateBody,
    });
  typia.assert(customer);

  // Authenticate as customer
  const customerLoginBody = {
    email: customerEmail,
    password: "1234",
    ip: undefined,
    href: "http://localhost/customer",
    referrer: "http://localhost/",
  } satisfies IShoppingMallCustomer.ILogin;
  const customerAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerAuth);

  // Create a product review by the authenticated customer for the created product
  const reviewCreateBody = {
    shopping_mall_product_id: product.id,
    rating: RandomGenerator.pick([1, 2, 3, 4, 5] as const),
    title: RandomGenerator.paragraph({ sentences: 4 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    moderation_status: "pending",
  } satisfies IShoppingMallProductReview.ICreate;
  const review: IShoppingMallProductReview =
    await api.functional.shoppingMall.customer.shoppingMallProductReviews.create(
      connection,
      { body: reviewCreateBody },
    );
  typia.assert(review);

  // Validate review matches product and customer info
  TestValidator.equals(
    "review product id matches",
    review.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "review rating in allowed range",
    [1, 2, 3, 4, 5].includes(review.rating),
    true,
  );
  TestValidator.equals(
    "review moderation_status is 'pending'",
    review.moderation_status,
    "pending",
  );
}
