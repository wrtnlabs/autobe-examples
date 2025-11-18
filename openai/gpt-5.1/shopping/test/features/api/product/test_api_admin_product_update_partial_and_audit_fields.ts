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

export async function test_api_admin_product_update_partial_and_audit_fields(
  connection: api.IConnection,
) {
  // 1. Seller joins (creates seller account and authenticates)
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://shoppingmall.example.com/seller/join",
    referrer: "https://shoppingmall.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorized);

  // (Optional) Seller login to exercise login endpoint as dependency, using same email
  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://shoppingmall.example.com/seller/login",
    referrer: "https://shoppingmall.example.com/landing",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerAfterLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAfterLogin);

  // 2. Seller creates a rich product
  const createProductBody = {
    code: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    summary: RandomGenerator.paragraph({
      sentences: 6,
      wordMin: 3,
      wordMax: 10,
    }),
    description: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 10,
    }),
    brand: RandomGenerator.name(1),
    model_name: RandomGenerator.alphaNumeric(8),
    status: "active",
    primary_image_uri:
      "https://cdn.shoppingmall.example.com/images/" +
      RandomGenerator.alphaNumeric(16) +
      ".jpg",
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const originalProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: createProductBody,
    });
  typia.assert<IShoppingMallProduct>(originalProduct);

  // Assert some basic invariants on original product
  TestValidator.equals(
    "original product code must match create payload",
    originalProduct.code,
    createProductBody.code,
  );
  TestValidator.equals(
    "original product title must match create payload",
    originalProduct.title,
    createProductBody.title,
  );
  TestValidator.equals(
    "original product summary must match create payload",
    originalProduct.summary,
    createProductBody.summary,
  );
  TestValidator.equals(
    "original product description must match create payload",
    originalProduct.description,
    createProductBody.description,
  );
  TestValidator.equals(
    "original product brand must match create payload",
    originalProduct.brand,
    createProductBody.brand,
  );
  TestValidator.equals(
    "original product model_name must match create payload",
    originalProduct.model_name,
    createProductBody.model_name,
  );
  TestValidator.equals(
    "original product status must match create payload",
    originalProduct.status,
    createProductBody.status,
  );
  TestValidator.equals(
    "original product primary_image_uri must match create payload",
    originalProduct.primary_image_uri,
    createProductBody.primary_image_uri,
  );
  TestValidator.equals(
    "original product default_locale must match create payload",
    originalProduct.default_locale,
    createProductBody.default_locale,
  );

  const productId = originalProduct.id;
  const originalCreatedAt = originalProduct.created_at;
  const originalUpdatedAt = originalProduct.updated_at;
  const originalDeletedAt = originalProduct.deleted_at ?? null;

  TestValidator.equals(
    "original product deleted_at must be null on creation",
    originalDeletedAt,
    null,
  );

  // 3. Admin joins (register admin and authenticate)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://shoppingmall.example.com/admin/join",
    referrer: "https://shoppingmall.example.com/admin-landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // (Optional) Admin login to exercise login endpoint as dependency
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://shoppingmall.example.com/admin/login",
    referrer: "https://shoppingmall.example.com/admin-landing",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminAfterLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAfterLogin);

  // 4. Admin performs first partial update: change brand and model_name only
  const firstUpdateBody = {
    brand: RandomGenerator.name(1),
    model_name: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallProduct.IUpdate;

  const afterFirstUpdate: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.update(connection, {
      productId,
      body: firstUpdateBody,
    });
  typia.assert<IShoppingMallProduct>(afterFirstUpdate);

  // Validate changed fields
  TestValidator.equals(
    "after first update, brand must be updated",
    afterFirstUpdate.brand,
    firstUpdateBody.brand,
  );
  TestValidator.equals(
    "after first update, model_name must be updated",
    afterFirstUpdate.model_name,
    firstUpdateBody.model_name,
  );

  // Validate unchanged fields preserved
  TestValidator.equals(
    "after first update, code must be preserved",
    afterFirstUpdate.code,
    originalProduct.code,
  );
  TestValidator.equals(
    "after first update, title must be preserved",
    afterFirstUpdate.title,
    originalProduct.title,
  );
  TestValidator.equals(
    "after first update, summary must be preserved",
    afterFirstUpdate.summary,
    originalProduct.summary,
  );
  TestValidator.equals(
    "after first update, description must be preserved",
    afterFirstUpdate.description,
    originalProduct.description,
  );
  TestValidator.equals(
    "after first update, status must be preserved",
    afterFirstUpdate.status,
    originalProduct.status,
  );
  TestValidator.equals(
    "after first update, primary_image_uri must be preserved",
    afterFirstUpdate.primary_image_uri,
    originalProduct.primary_image_uri,
  );
  TestValidator.equals(
    "after first update, default_locale must be preserved",
    afterFirstUpdate.default_locale,
    originalProduct.default_locale,
  );
  TestValidator.equals(
    "after first update, created_at must remain unchanged",
    afterFirstUpdate.created_at,
    originalCreatedAt,
  );

  const firstUpdatedAt = afterFirstUpdate.updated_at;
  const firstDeletedAt = afterFirstUpdate.deleted_at ?? null;

  await TestValidator.predicate(
    "after first update, updated_at must be greater than original updated_at",
    async () =>
      new Date(firstUpdatedAt).getTime() >
      new Date(originalUpdatedAt).getTime(),
  );

  TestValidator.equals(
    "after first update, deleted_at must remain null",
    firstDeletedAt,
    null,
  );

  // 5. Admin performs second partial update: change only status
  const secondUpdateBody = {
    status: "inactive",
  } satisfies IShoppingMallProduct.IUpdate;

  const afterSecondUpdate: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.update(connection, {
      productId,
      body: secondUpdateBody,
    });
  typia.assert<IShoppingMallProduct>(afterSecondUpdate);

  // Validate changed status
  TestValidator.equals(
    "after second update, status must be updated",
    afterSecondUpdate.status,
    secondUpdateBody.status,
  );

  // Validate previously updated brand/model_name still preserved from first update
  TestValidator.equals(
    "after second update, brand must stay from first update",
    afterSecondUpdate.brand,
    firstUpdateBody.brand,
  );
  TestValidator.equals(
    "after second update, model_name must stay from first update",
    afterSecondUpdate.model_name,
    firstUpdateBody.model_name,
  );

  // Validate other fields still unchanged from original
  TestValidator.equals(
    "after second update, code must still match original",
    afterSecondUpdate.code,
    originalProduct.code,
  );
  TestValidator.equals(
    "after second update, title must still match original",
    afterSecondUpdate.title,
    originalProduct.title,
  );
  TestValidator.equals(
    "after second update, summary must still match original",
    afterSecondUpdate.summary,
    originalProduct.summary,
  );
  TestValidator.equals(
    "after second update, description must still match original",
    afterSecondUpdate.description,
    originalProduct.description,
  );
  TestValidator.equals(
    "after second update, primary_image_uri must still match original",
    afterSecondUpdate.primary_image_uri,
    originalProduct.primary_image_uri,
  );
  TestValidator.equals(
    "after second update, default_locale must still match original",
    afterSecondUpdate.default_locale,
    originalProduct.default_locale,
  );

  // Audit fields
  TestValidator.equals(
    "after second update, created_at must still equal original created_at",
    afterSecondUpdate.created_at,
    originalCreatedAt,
  );

  await TestValidator.predicate(
    "after second update, updated_at must be greater than first updated_at",
    async () =>
      new Date(afterSecondUpdate.updated_at).getTime() >
      new Date(firstUpdatedAt).getTime(),
  );

  const secondDeletedAt = afterSecondUpdate.deleted_at ?? null;
  TestValidator.equals(
    "after second update, deleted_at must remain null",
    secondDeletedAt,
    null,
  );

  // Ownership invariants
  TestValidator.equals(
    "product seller ownership must remain stable",
    afterSecondUpdate.shopping_mall_seller_id,
    originalProduct.shopping_mall_seller_id,
  );
}
