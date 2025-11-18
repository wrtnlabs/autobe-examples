import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCategoryLocalization } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryLocalization";

export async function test_api_admin_category_localization_update_reject_ineligible_category_state(
  connection: api.IConnection,
) {
  // 1. Join an admin to obtain authenticated context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create an initially active/visible category
  const createCategoryBody = {
    parent_id: null,
    slug: RandomGenerator.alphabets(12),
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 4 }),
    status: "active",
    sort_order: 1 satisfies number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: createCategoryBody,
    });
  typia.assert(category);

  // 3. Create a localization for that category
  const localeCode = "en-US";
  const createLocalizationBody = {
    locale: localeCode,
    name: RandomGenerator.paragraph({ sentences: 1 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    seo_title: RandomGenerator.paragraph({ sentences: 1 }),
    seo_description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IShoppingMallCategoryLocalization.ICreate;

  const localization: IShoppingMallCategoryLocalization =
    await api.functional.shoppingMall.admin.categories.localizations.create(
      connection,
      {
        categoryId: category.id,
        body: createLocalizationBody,
      },
    );
  typia.assert(localization);

  // Capture pre-update snapshot for later comparison
  const beforeUpdate = localization;

  // 4. Transition category to an ineligible state (e.g., hidden or archived)
  const ineligibleStatus = "hidden";
  const updateCategoryBody = {
    status: ineligibleStatus,
  } satisfies IShoppingMallCategory.IUpdate;

  const updatedCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.update(connection, {
      categoryId: category.id,
      body: updateCategoryBody,
    });
  typia.assert(updatedCategory);

  TestValidator.equals(
    "category status should be updated to ineligible state",
    updatedCategory.status,
    ineligibleStatus,
  );

  // 5. Attempt to update localization while category is in ineligible status
  const updateLocalizationBody = {
    name: RandomGenerator.paragraph({ sentences: 1 }),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    seo_title: RandomGenerator.paragraph({ sentences: 1 }),
    seo_description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IShoppingMallCategoryLocalization.IUpdate;

  await TestValidator.error(
    "localization update should be rejected when category is in ineligible lifecycle state",
    async () => {
      await api.functional.shoppingMall.admin.categories.localizations.update(
        connection,
        {
          categoryId: category.id,
          locale: localeCode,
          body: updateLocalizationBody,
        },
      );
    },
  );

  // 6. (Best-effort) Re-fetch localization via simulator to ensure snapshot remains unchanged.
  // There is no dedicated GET endpoint available in this SDK, so we limit ourselves
  // to verifying that the last successful state we observed (beforeUpdate) remains
  // a valid localization object and that the failing update did not produce a new
  // successful response.
  typia.assert(beforeUpdate);
}
