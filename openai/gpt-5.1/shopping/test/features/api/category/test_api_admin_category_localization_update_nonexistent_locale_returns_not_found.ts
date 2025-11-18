import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCategoryLocalization } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryLocalization";

export async function test_api_admin_category_localization_update_nonexistent_locale_returns_not_found(
  connection: api.IConnection,
) {
  // 1. Join as an admin to establish authenticated admin context
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create a base category
  const categoryCreateBody = typia.random<IShoppingMallCategory.ICreate>();
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: categoryCreateBody,
    },
  );
  typia.assert<IShoppingMallCategory>(category);

  // 3. Choose a locale that should not have a localization yet
  const nonexistentLocale: string = `zz-${RandomGenerator.alphabets(4)}`;

  // 4. Prepare a valid localization update payload
  const updateBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    seo_title: RandomGenerator.paragraph({ sentences: 2 }),
    seo_description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IShoppingMallCategoryLocalization.IUpdate;

  // 5. Attempt to update a non-existent localization and expect a not-found HTTP error
  await TestValidator.httpError(
    "updating non-existent category localization should return 404",
    404,
    async () => {
      await api.functional.shoppingMall.admin.categories.localizations.update(
        connection,
        {
          categoryId: category.id,
          locale: nonexistentLocale,
          body: updateBody,
        },
      );
    },
  );
}
