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
 * Verify that a seller cannot delete another seller's product localization and
 * that the localization remains after the forbidden attempt.
 *
 * Business context:
 *
 * - Multiple sellers exist on the shopping mall platform.
 * - Each seller can create products and localized content for those products.
 * - Authorization must ensure that a seller cannot tamper with another seller's
 *   product localizations, even though they share the same DELETE endpoint.
 *
 * Steps:
 *
 * 1. Register seller A (join) and become authenticated as seller A.
 * 2. Under seller A, create product A.
 * 3. Under seller A, create localization L for product A.
 * 4. Register seller B (join) and then login as seller B so the connection headers
 *    now represent seller B.
 * 5. As seller B, attempt to delete localization L of product A using the seller
 *    DELETE endpoint and assert that it fails.
 * 6. Create an admin account and login so the connection now represents an admin
 *    actor.
 * 7. As admin, list localizations for product A and confirm that localization L is
 *    still present.
 */
export async function test_api_seller_product_localization_delete_cross_role_access(
  connection: api.IConnection,
) {
  // 1. Register seller A via /auth/seller/join
  const sellerAEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerAPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const sellerAJoinBody = {
    email: sellerAEmail,
    password: sellerAPassword,
    ip: null,
    href: "https://seller-a.example.com/join",
    referrer: "https://seller-a.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerAJoinBody,
    });
  typia.assert(sellerAAuth);

  // 2. Under seller A, create product A
  const productACreateBody = {
    code: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: RandomGenerator.paragraph({ sentences: 1 }),
    model_name: RandomGenerator.paragraph({ sentences: 1 }),
    status: "active",
    primary_image_uri:
      "https://cdn.example.com/images/" +
      RandomGenerator.alphaNumeric(16) +
      ".jpg",
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const productA: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productACreateBody,
    });
  typia.assert(productA);

  // 3. Under seller A, create localization L for product A
  const localizationLocale = "fr-FR";
  const localizationCreateBody = {
    locale: localizationLocale,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    summary: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies IShoppingMallProductLocalization.ICreate;

  const localization: IShoppingMallProductLocalization =
    await api.functional.shoppingMall.seller.products.localizations.create(
      connection,
      {
        productId: productA.id,
        body: localizationCreateBody,
      },
    );
  typia.assert(localization);

  // 4. Register seller B via /auth/seller/join and login as seller B
  const sellerBEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerBPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const sellerBJoinBody = {
    email: sellerBEmail,
    password: sellerBPassword,
    ip: null,
    href: "https://seller-b.example.com/join",
    referrer: "https://seller-b.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerBAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerBJoinBody,
    });
  typia.assert(sellerBAuth);

  // Explicit login as seller B (even though join already authenticated)
  const sellerBLoginBody = {
    email: sellerBEmail,
    password: sellerBPassword,
    ip: null,
    href: "https://seller-b.example.com/login",
    referrer: "https://seller-b.example.com/landing",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerBLoginAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerBLoginBody,
    });
  typia.assert(sellerBLoginAuth);

  // 5. As seller B, attempt to delete localization L of product A
  await TestValidator.error(
    "seller B cannot delete seller A's product localization",
    async () => {
      await api.functional.shoppingMall.seller.products.localizations.erase(
        connection,
        {
          productId: productA.id,
          productLocalizationId: localization.id,
        },
      );
    },
  );

  // 6. Create an admin account and login so the connection now represents admin
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuth);

  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLoginAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuth);

  // 7. As admin, list localizations for product A and ensure localization L exists
  const adminListRequestBody = {
    page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 20 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
    locales: [localizationLocale],
    search: undefined,
    orderBy: "created_at" as const,
    orderDirection: "desc" as const,
  } satisfies IShoppingMallProductLocalization.IRequest;

  const page: IPageIShoppingMallProductLocalization.ISummary =
    await api.functional.shoppingMall.admin.products.localizations.index(
      connection,
      {
        productId: productA.id,
        body: adminListRequestBody,
      },
    );
  typia.assert(page);

  const found = page.data.find((item) => item.id === localization.id);

  TestValidator.predicate(
    "localization should still exist after forbidden delete attempt",
    found !== undefined,
  );
}
