import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

export async function test_api_admin_product_update_governance_override(
  connection: api.IConnection,
) {
  // 1. Seller signs up via /auth/seller/join
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://seller-portal.example.com/join",
    referrer: "https://seller-portal.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 2. Seller logs in explicitly via /auth/seller/login (exercise login flow)
  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller-portal.example.com/login",
    referrer: "https://seller-portal.example.com/join-complete",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedIn);

  TestValidator.equals(
    "seller id remains same between join and login",
    sellerLoggedIn.id,
    sellerAuthorized.id,
  );

  // 3. Seller creates a product via /shoppingMall/seller/products
  const createProductBody = {
    code: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 10 }),
    summary: RandomGenerator.paragraph({
      sentences: 6,
      wordMin: 3,
      wordMax: 10,
    }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 15,
      wordMin: 3,
      wordMax: 10,
    }),
    brand: "SellerBrand",
    model_name: "Model-X",
    status: "active",
    primary_image_uri: typia.random<string & tags.Format<"uri">>(),
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const createdProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: createProductBody,
    });
  typia.assert(createdProduct);

  TestValidator.equals(
    "created product code matches requested code",
    createdProduct.code,
    createProductBody.code,
  );

  TestValidator.equals(
    "created product status matches requested status",
    createdProduct.status,
    createProductBody.status,
  );

  // Capture original fields for later comparison
  const originalProductId = createdProduct.id;
  const originalSellerId = createdProduct.shopping_mall_seller_id;
  const originalUpdatedAt = createdProduct.updated_at;

  // 4. Admin joins via /auth/admin/join
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin-portal.example.com/join",
    referrer: "https://admin-portal.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 5. Admin logs in explicitly via /auth/admin/login to ensure context
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin-portal.example.com/login",
    referrer: "https://admin-portal.example.com/join-complete",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLoggedIn: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  TestValidator.equals(
    "admin id remains same between join and login",
    adminLoggedIn.id,
    adminAuthorized.id,
  );

  // 6. Admin updates the product via /shoppingMall/admin/products/{productId}
  const overriddenTitle = `${createdProduct.title} [Admin Corrected]`;
  const overriddenBrand = "AdminBrandOverride";
  const overriddenStatus = "admin_unpublished";

  const updateProductBody = {
    title: overriddenTitle,
    brand: overriddenBrand,
    status: overriddenStatus,
  } satisfies IShoppingMallProduct.IUpdate;

  const updatedProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.update(connection, {
      productId: createdProduct.id,
      body: updateProductBody,
    });
  typia.assert(updatedProduct);

  // 7. Business assertions on admin override behavior
  TestValidator.equals(
    "product id remains stable after admin update",
    updatedProduct.id,
    originalProductId,
  );

  TestValidator.equals(
    "product ownership (seller) remains unchanged after admin update",
    updatedProduct.shopping_mall_seller_id,
    originalSellerId,
  );

  TestValidator.equals(
    "product title reflects admin override",
    updatedProduct.title,
    overriddenTitle,
  );

  TestValidator.equals(
    "product brand reflects admin override",
    updatedProduct.brand,
    overriddenBrand,
  );

  TestValidator.equals(
    "product status reflects governance override value",
    updatedProduct.status,
    overriddenStatus,
  );

  TestValidator.notEquals(
    "updated_at should change after admin update",
    updatedProduct.updated_at,
    originalUpdatedAt,
  );
}
