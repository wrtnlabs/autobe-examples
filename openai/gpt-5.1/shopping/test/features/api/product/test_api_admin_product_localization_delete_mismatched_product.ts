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
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductLocalization } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductLocalization";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

/**
 * Validate admin delete of product localization with mismatched productId.
 *
 * Business workflow:
 *
 * 1. Seller joins the platform.
 * 2. Seller creates two products: productA and productB.
 * 3. Seller creates a localization record only for productA.
 * 4. Admin joins (and becomes authenticated).
 * 5. Admin attempts to delete the localization using productB's ID together with
 *    productA's localization ID.
 *
 *    - This must fail with some error (treated as a not-found style error), not a
 *         successful deletion.
 * 6. Admin lists localizations for productA and confirms that the original
 *    localization is still present.
 *
 * What this test verifies:
 *
 * - The erase endpoint validates that a localization belongs to the specified
 *   product.
 * - A cross-product mismatch (productB + localizationA) is rejected (error
 *   thrown) rather than silently deleting.
 * - The localization remains intact and discoverable via the correct product's
 *   localization listing.
 */
export async function test_api_admin_product_localization_delete_mismatched_product(
  connection: api.IConnection,
) {
  // 1. Seller joins the platform.
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorized);

  // 2. Seller creates two products: productA and productB.
  const baseCode = RandomGenerator.alphaNumeric(8);

  const productABody = {
    code: `${baseCode}-A`,
    title: RandomGenerator.name(),
    summary: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "TestBrand",
    model_name: "Model-A",
    status: "active",
    primary_image_uri: "https://cdn.example.com/product-a.jpg",
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const productA: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productABody,
    });
  typia.assert<IShoppingMallProduct>(productA);

  const productBBody = {
    code: `${baseCode}-B`,
    title: RandomGenerator.name(),
    summary: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "TestBrand",
    model_name: "Model-B",
    status: "active",
    primary_image_uri: "https://cdn.example.com/product-b.jpg",
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const productB: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBBody,
    });
  typia.assert<IShoppingMallProduct>(productB);

  // 3. Seller creates a localization for productA only.
  const localizationCreateBody = {
    locale: "ko-KR",
    title: RandomGenerator.name(),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies IShoppingMallProductLocalization.ICreate;

  const localizationA: IShoppingMallProductLocalization =
    await api.functional.shoppingMall.seller.products.localizations.create(
      connection,
      {
        productId: productA.id,
        body: localizationCreateBody,
      },
    );
  typia.assert<IShoppingMallProductLocalization>(localizationA);

  // 4. Admin joins and becomes authenticated.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 5. Admin attempts mismatched delete (productB with localizationA.id).
  await TestValidator.error(
    "admin erase with mismatched productId and localizationId must fail",
    async () => {
      await api.functional.shoppingMall.admin.products.localizations.erase(
        connection,
        {
          productId: productB.id,
          productLocalizationId: localizationA.id,
        },
      );
    },
  );

  // 6. Admin lists localizations for productA and ensures localizationA still exists.
  const listRequestBody = {
    page: 1,
    limit: 10,
    locales: undefined,
    search: undefined,
    orderBy: undefined,
    orderDirection: undefined,
  } satisfies IShoppingMallProductLocalization.IRequest;

  const localizationPage: IPageIShoppingMallProductLocalization.ISummary =
    await api.functional.shoppingMall.admin.products.localizations.index(
      connection,
      {
        productId: productA.id,
        body: listRequestBody,
      },
    );
  typia.assert<IPageIShoppingMallProductLocalization.ISummary>(
    localizationPage,
  );

  const existsForProductA = localizationPage.data.some((summary) => {
    return (
      summary.id === localizationA.id && summary.product_id === productA.id
    );
  });

  TestValidator.predicate(
    "localization created for productA must still exist after failed mismatched delete",
    existsForProductA,
  );
}
