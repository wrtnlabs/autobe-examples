import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCategoryLocalization } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryLocalization";

export async function test_api_admin_delete_category_localization_success(
  connection: api.IConnection,
) {
  // 1. Admin join & authentication
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16) as string &
      tags.Format<"password">,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create a category as admin
  const categoryBody = {
    parent_id: null,
    slug: RandomGenerator.alphabets(16),
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 5 }),
    status: "active",
    sort_order: typia.random<number & tags.Type<"int32">>(),
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody,
    });
  typia.assert<IShoppingMallCategory>(category);

  // 3. Create a localization for that category
  const locale = "en-US";
  const localizationBody = {
    locale,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    seo_title: RandomGenerator.paragraph({ sentences: 3 }),
    seo_description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IShoppingMallCategoryLocalization.ICreate;

  const localization: IShoppingMallCategoryLocalization =
    await api.functional.shoppingMall.admin.categories.localizations.create(
      connection,
      {
        categoryId: category.id,
        body: localizationBody,
      },
    );
  typia.assert<IShoppingMallCategoryLocalization>(localization);

  TestValidator.equals(
    "created localization locale should match requested locale",
    localization.locale,
    locale,
  );

  if (localization.category !== undefined && localization.category !== null) {
    TestValidator.equals(
      "localization category id should match created category id",
      localization.category.id,
      category.id,
    );
  }

  // 4. Delete the created localization (target under test)
  await api.functional.shoppingMall.admin.categories.localizations.erase(
    connection,
    {
      categoryId: category.id,
      locale,
    },
  );
}
