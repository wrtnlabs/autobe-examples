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

export async function test_api_admin_delete_product_review_moderation(
  connection: api.IConnection,
) {
  // 1. Admin joins
  const adminJoinBody = {
    email: RandomGenerator.name(1) + "@admin.test",
    password: "admin1234",
    href: "https://admin.test/home",
    referrer: "https://admin.test/referrer",
  } satisfies IShoppingMallAdmin.IJoin;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Admin creates another admin account for moderation operations
  const adminCreateBody = {
    email: RandomGenerator.name(1) + "@admin2.test",
    password: "adminpass",
  } satisfies IShoppingMallAdmin.ICreate;
  const createdAdmin: IShoppingMallAdmin =
    await api.functional.shoppingMall.admin.shoppingMallAdmins.create(
      connection,
      { body: adminCreateBody },
    );
  typia.assert(createdAdmin);

  // 3. Seller joins
  const sellerJoinBody = {
    email: RandomGenerator.name(1) + "@seller.test",
    password: "seller1234",
  } satisfies IShoppingMallSeller.ICreate;
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(seller);

  // 4. Seller creates product
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: RandomGenerator.name(1),
    category_code: "default", // assumed "default" is valid category_code
  } satisfies IShoppingMallProduct.ICreate;
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.shoppingMallProducts.create(
      connection,
      { body: productCreateBody },
    );
  typia.assert(product);

  // 5. Customer joins
  const customerJoinBody = {
    email: RandomGenerator.name(1) + "@customer.test",
    password: "customer1234",
    href: "https://customer.test/home",
    referrer: "https://customer.test/referrer",
  } satisfies IShoppingMallCustomer.ICreate;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customer);

  // 6. Customer creates a product review
  const reviewCreateBody = {
    shopping_mall_product_id: product.id,
    rating: 5,
    title: "Excellent Product",
    body: RandomGenerator.content({ paragraphs: 1 }),
    moderation_status: "pending",
  } satisfies IShoppingMallProductReview.ICreate;
  const review: IShoppingMallProductReview =
    await api.functional.shoppingMall.customer.shoppingMallProductReviews.create(
      connection,
      { body: reviewCreateBody },
    );
  typia.assert(review);

  // 7. Admin deletes a moderation record for the review
  // Because the moderation record ID is not given in the scenario, assuming review.id as the moderation ID, since schema or function to create moderation not provided
  await api.functional.shoppingMall.admin.shoppingMallProductReviews.shoppingMallReviewModerations.erase(
    connection,
    {
      shoppingMallProductReviewId: review.id,
      shoppingMallReviewModerationId: review.id,
    },
  );
}
