import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCategoryLocalization } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryLocalization";

/**
 * Validate that public category localization retrieval respects lifecycle-style
 * visibility by exposing only existing localized records for visible categories
 * and returning not-found style errors when localizations do not exist.
 *
 * Business intent:
 *
 * - Storefront clients use GET
 *   /shoppingMall/categories/{categoryId}/localizations/{locale} to fetch
 *   localized category labels.
 * - Only categories that exist and have a localization for the requested locale
 *   should be returned.
 * - When a category or its localization is missing (or conceptually
 *   hidden/archived), the public endpoint must behave as a not-found style
 *   error, not leaking internal state.
 *
 * Scenario steps:
 *
 * 1. Admin joins the platform (POST /auth/admin/join) to obtain an authenticated
 *    context.
 * 2. Admin creates an active category (POST /shoppingMall/admin/categories).
 * 3. Admin creates a localization for that category (POST
 *    /shoppingMall/admin/categories/{categoryId}/localizations).
 * 4. Public GET /shoppingMall/categories/{categoryId}/localizations/{locale}
 *    successfully returns the localization.
 * 5. Public GET with an unknown categoryId returns an HTTP error (not
 *    found-style).
 * 6. Public GET with an unknown locale for an existing category returns an HTTP
 *    error.
 */
export async function test_api_category_localizations_at_respects_lifecycle_visibility(
  connection: api.IConnection,
) {
  // 1. Admin joins the platform
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16) as string &
      tags.Format<"password">,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Admin creates an active category
  const categoryCreateBody = {
    parent_id: null,
    slug: RandomGenerator.alphaNumeric(12),
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 4 }),
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert<IShoppingMallCategory>(category);

  TestValidator.equals(
    "created category should be active",
    category.status,
    "active",
  );

  // 3. Admin creates a localization for that category
  const locale = "en-US";
  const localizationCreateBody = {
    locale,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    seo_title: RandomGenerator.paragraph({ sentences: 2 }),
    seo_description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallCategoryLocalization.ICreate;

  const createdLocalization: IShoppingMallCategoryLocalization =
    await api.functional.shoppingMall.admin.categories.localizations.create(
      connection,
      {
        categoryId: category.id,
        body: localizationCreateBody,
      },
    );
  typia.assert<IShoppingMallCategoryLocalization>(createdLocalization);

  TestValidator.equals(
    "created localization has requested locale",
    createdLocalization.locale,
    locale,
  );

  if (createdLocalization.category !== undefined) {
    TestValidator.equals(
      "created localization's category id matches",
      createdLocalization.category.id,
      category.id,
    );
  }

  // 4. Public GET returns the localization for existing category + locale
  const fetchedLocalization: IShoppingMallCategoryLocalization =
    await api.functional.shoppingMall.categories.localizations.at(connection, {
      categoryId: category.id,
      locale,
    });
  typia.assert<IShoppingMallCategoryLocalization>(fetchedLocalization);

  TestValidator.equals(
    "public get returns same locale",
    fetchedLocalization.locale,
    locale,
  );

  if (fetchedLocalization.category !== undefined) {
    TestValidator.equals(
      "public get returns same category id",
      fetchedLocalization.category.id,
      category.id,
    );
  }

  // 5. Public GET with unknown categoryId should fail with HTTP error
  const unknownCategoryId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.httpError(
    "unknown categoryId should not expose localization",
    [400, 404, 422],
    async () => {
      await api.functional.shoppingMall.categories.localizations.at(
        connection,
        {
          categoryId: unknownCategoryId,
          locale,
        },
      );
    },
  );

  // 6. Public GET with unknown locale for existing category should fail
  const unknownLocale = "fr-FR";

  await TestValidator.httpError(
    "unknown locale for existing category should not expose localization",
    [400, 404, 422],
    async () => {
      await api.functional.shoppingMall.categories.localizations.at(
        connection,
        {
          categoryId: category.id,
          locale: unknownLocale,
        },
      );
    },
  );
}
