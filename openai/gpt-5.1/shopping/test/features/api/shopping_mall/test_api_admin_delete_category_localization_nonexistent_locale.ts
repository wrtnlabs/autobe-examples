import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCategoryLocalization } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryLocalization";

export async function test_api_admin_delete_category_localization_nonexistent_locale(
  connection: api.IConnection,
) {
  // 1. Join as admin to establish authenticated admin context
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: "P@ssw0rd!", // any string is fine; Format<"password"> is logical only
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a category that we will localize
  const categoryCreateBody = {
    parent_id: null,
    slug: RandomGenerator.alphabets(12),
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 4 }),
    status: "active",
    sort_order: 1,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert(category);

  // 3. Create one existing localization (e.g. "en-US") to ensure category has at least one localization
  const existingLocale = "en-US";
  const existingLocalizationBody = {
    locale: existingLocale,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    seo_title: RandomGenerator.paragraph({ sentences: 1 }),
    seo_description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IShoppingMallCategoryLocalization.ICreate;

  const existingLocalization: IShoppingMallCategoryLocalization =
    await api.functional.shoppingMall.admin.categories.localizations.create(
      connection,
      {
        categoryId: category.id,
        body: existingLocalizationBody,
      },
    );
  typia.assert(existingLocalization);

  // 4. Attempt to delete a localization for a non-existent locale (e.g. "fr-FR")
  const nonexistentLocale = "fr-FR";

  await TestValidator.error(
    "deleting non-existent category localization must fail",
    async () => {
      await api.functional.shoppingMall.admin.categories.localizations.erase(
        connection,
        {
          categoryId: category.id,
          locale: nonexistentLocale,
        },
      );
    },
  );

  // 5. Sanity check: previously created localization object is still structurally valid
  // We cannot re-fetch it, but we at least ensure its shape remains correct.
  typia.assert<IShoppingMallCategoryLocalization>(existingLocalization);
}
