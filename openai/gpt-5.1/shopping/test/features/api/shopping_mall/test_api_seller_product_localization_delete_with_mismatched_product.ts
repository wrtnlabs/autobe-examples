import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductLocalization } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductLocalization";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductLocalization } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductLocalization";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

/**
 * Validate that deleting a product localization with a mismatched productId
 * fails safely and does not remove the real localization.
 *
 * Business flow:
 *
 * 1. Register & login seller.
 * 2. Register & login admin.
 * 3. As seller, create two products: productA and productB.
 * 4. As admin, create a category and link it to both products for realism.
 * 5. As seller, create a localization only for productA and capture its id.
 * 6. As seller, attempt to delete that localization using productB.id in the path
 *    and the localization id from productA.
 * 7. Assert that the delete call throws an error (using TestValidator.error),
 *    without inspecting HTTP status codes or error messages.
 * 8. As admin, list localizations for productA and assert that the original
 *    localization is still present.
 */
export async function test_api_seller_product_localization_delete_with_mismatched_product(
  connection: api.IConnection,
) {
  // 1. Register & login seller
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerJoinBody = {
    email: sellerEmail,
    password: "Password123!",
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerJoin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerJoin);

  // Explicit seller login to simulate usual flow (even if join already issued a token)
  const sellerLoginBody = {
    email: sellerEmail,
    password: "Password123!",
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerLogin);

  // 2. Register & login admin (for category and localization listing)
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminJoinBody = {
    email: adminEmail,
    password: "Password123!",
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminJoin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminJoin);

  const adminLoginBody = {
    email: adminEmail,
    password: "Password123!",
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminLogin);

  // 3. As seller, create two products: productA and productB
  // Switch to seller context again
  const sellerReLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerReLogin);

  const defaultLocale = "en-US";

  const productABody = {
    code: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.name(3),
    summary: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 3,
      wordMax: 8,
    }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 8,
    }),
    brand: RandomGenerator.name(1),
    model_name: RandomGenerator.alphaNumeric(6),
    status: "active",
    primary_image_uri:
      "https://cdn.example.com/products/" + RandomGenerator.alphaNumeric(8),
    default_locale: defaultLocale,
  } satisfies IShoppingMallProduct.ICreate;

  const productA: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productABody,
    });
  typia.assert<IShoppingMallProduct>(productA);

  const productBBody = {
    code: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.name(3),
    summary: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 3,
      wordMax: 8,
    }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 8,
    }),
    brand: RandomGenerator.name(1),
    model_name: RandomGenerator.alphaNumeric(6),
    status: "active",
    primary_image_uri:
      "https://cdn.example.com/products/" + RandomGenerator.alphaNumeric(8),
    default_locale: defaultLocale,
  } satisfies IShoppingMallProduct.ICreate;

  const productB: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBBody,
    });
  typia.assert<IShoppingMallProduct>(productB);

  // 4. As admin, create a category and link it to both products
  const adminReLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminReLogin);

  const categoryBody = {
    parent_id: null,
    slug: RandomGenerator.alphaNumeric(10),
    name_en: RandomGenerator.name(2),
    description_en: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 3,
      wordMax: 8,
    }),
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody,
    });
  typia.assert<IShoppingMallCategory>(category);

  const productACategoryBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;

  const productACategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: productA.id,
        body: productACategoryBody,
      },
    );
  typia.assert<IShoppingMallProductCategory>(productACategory);

  const productBCategoryBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;

  const productBCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: productB.id,
        body: productBCategoryBody,
      },
    );
  typia.assert<IShoppingMallProductCategory>(productBCategory);

  // 5. As seller, create a localization only for productA
  const sellerLoginForLocalization: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerLoginForLocalization);

  const locale = "en-GB";
  const localizationCreateBody = {
    locale,
    title: RandomGenerator.name(4),
    summary: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 3,
      wordMax: 8,
    }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 8,
    }),
  } satisfies IShoppingMallProductLocalization.ICreate;

  const productALocalization: IShoppingMallProductLocalization =
    await api.functional.shoppingMall.seller.products.localizations.create(
      connection,
      {
        productId: productA.id,
        body: localizationCreateBody,
      },
    );
  typia.assert<IShoppingMallProductLocalization>(productALocalization);

  const localizationIdA = productALocalization.id;

  // 6. Attempt mismatched delete: use productB.id with localizationId from productA
  await TestValidator.error(
    "delete localization with mismatched productId should fail",
    async () => {
      await api.functional.shoppingMall.seller.products.localizations.erase(
        connection,
        {
          productId: productB.id,
          productLocalizationId: localizationIdA,
        },
      );
    },
  );

  // 7. As admin, list localizations for productA and confirm localization still exists
  const adminLoginForList: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminLoginForList);

  const listRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    locales: [locale],
    search: undefined,
    orderBy: "created_at" as "created_at",
    orderDirection: "asc" as "asc",
  } satisfies IShoppingMallProductLocalization.IRequest;

  const page: IPageIShoppingMallProductLocalization.ISummary =
    await api.functional.shoppingMall.admin.products.localizations.index(
      connection,
      {
        productId: productA.id,
        body: listRequestBody,
      },
    );
  typia.assert<IPageIShoppingMallProductLocalization.ISummary>(page);

  const found = page.data.find((row) => row.id === localizationIdA);
  TestValidator.predicate(
    "original localization must still be present after failed mismatched delete",
    found !== undefined,
  );

  if (found !== undefined) {
    TestValidator.equals(
      "found localization id should match original id",
      found.id,
      localizationIdA,
    );
    TestValidator.equals(
      "found localization product_id should be productA.id",
      found.product_id,
      productA.id,
    );
    TestValidator.equals(
      "found localization locale should match created locale",
      found.locale,
      locale,
    );
  }
}
