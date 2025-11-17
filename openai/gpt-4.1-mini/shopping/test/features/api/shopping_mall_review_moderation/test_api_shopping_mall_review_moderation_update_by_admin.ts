import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import type { IShoppingMallReviewModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewModeration";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingMallCategory";

export async function test_api_shopping_mall_review_moderation_update_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Admin joins the system
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    ip: null,
    href: "https://example.com/admin/join",
    referrer: "https://example.com/admin/referrer",
  } satisfies IShoppingMallAdmin.IJoin;
  const adminUser = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(adminUser);

  // Step 2: Admin login
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://example.com/admin/login",
    referrer: "https://example.com/admin/referrer",
  } satisfies IShoppingMallAdmin.ILogin;
  await api.functional.auth.admin.login(connection, { body: adminLoginBody });

  // Step 3: Seller joins the system
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.ICreate;
  const sellerUser = await api.functional.auth.seller.join(connection, {
    body: sellerJoinBody,
  });
  typia.assert(sellerUser);

  // Step 4: Seller logs in
  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://example.com/seller/login",
    referrer: "https://example.com/seller/referrer",
  } satisfies IShoppingMallSeller.ILogin;
  await api.functional.auth.seller.login(connection, { body: sellerLoginBody });

  // Step 5: Seller creates a new product
  // Select a plausible existing category code
  // According to structures, category_code is a string. We'll generate a uuid-like string for category code.
  const categoryCode = typia.random<string & tags.Format<"uuid">>();
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    brand: RandomGenerator.name(1),
    category_code: categoryCode,
  } satisfies IShoppingMallProduct.ICreate;
  const product =
    await api.functional.shoppingMall.seller.shoppingMallProducts.create(
      connection,
      { body: productCreateBody },
    );
  typia.assert(product);

  // Step 6: Customer joins the system
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    href: "https://example.com/customer/join",
    referrer: "https://example.com/customer/referrer",
  } satisfies IShoppingMallCustomer.ICreate;
  const customerUser = await api.functional.auth.customer.join(connection, {
    body: customerJoinBody,
  });
  typia.assert(customerUser);

  // Step 7: Customer login
  const customerLoginBody = {
    email: customerJoinBody.email,
    password: customerJoinBody.password,
    ip: null,
    href: "https://example.com/customer/login",
    referrer: "https://example.com/customer/referrer",
  } satisfies IShoppingMallCustomer.ILogin;
  await api.functional.auth.customer.login(connection, {
    body: customerLoginBody,
  });

  // Step 8: Customer creates product review
  const reviewCreateBody = {
    shopping_mall_product_id: product.id,
    rating: 5,
    title: RandomGenerator.paragraph({ sentences: 4 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    moderation_status: "pending",
  } satisfies IShoppingMallProductReview.ICreate;
  const productReview =
    await api.functional.shoppingMall.customer.shoppingMallProductReviews.create(
      connection,
      { body: reviewCreateBody },
    );
  typia.assert(productReview);

  // Step 9: Admin creates another admin account for moderation privileges
  const adminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallAdmin.ICreate;
  const createdAdmin =
    await api.functional.shoppingMall.admin.shoppingMallAdmins.create(
      connection,
      { body: adminCreateBody },
    );
  typia.assert(createdAdmin);

  // Step 10: Admin logs in as the created admin
  const createdAdminLogin = {
    email: adminCreateBody.email,
    password: adminCreateBody.password,
    ip: null,
    href: "https://example.com/admin/login",
    referrer: "https://example.com/admin/referrer",
  } satisfies IShoppingMallAdmin.ILogin;
  await api.functional.auth.admin.login(connection, {
    body: createdAdminLogin,
  });

  // Step 11: Admin updates the moderation record
  const updateBody = {
    action: "approved",
    comment: "Moderation review approved successfully.",
  } satisfies IShoppingMallReviewModeration.IUpdate;

  // moderationId is required but unknown; generate a new UUID
  const moderationId = typia.random<string & tags.Format<"uuid">>();

  const updatedModeration =
    await api.functional.shoppingMall.admin.shoppingMallProductReviews.shoppingMallReviewModerations.update(
      connection,
      {
        shoppingMallProductReviewId: productReview.id,
        shoppingMallReviewModerationId: moderationId,
        body: updateBody,
      },
    );
  typia.assert(updatedModeration);

  // Validate updated properties
  TestValidator.equals(
    "moderation action should be 'approved'",
    updatedModeration.action,
    updateBody.action,
  );
  TestValidator.equals(
    "moderation comment should match",
    updatedModeration.comment ?? null,
    updateBody.comment,
  );
  TestValidator.equals(
    "moderation shoppingMallProductReviewId should match",
    updatedModeration.shoppingMallProductReviewId,
    productReview.id,
  );
  TestValidator.equals(
    "moderation id should match moderationId",
    updatedModeration.id,
    moderationId,
  );
}
