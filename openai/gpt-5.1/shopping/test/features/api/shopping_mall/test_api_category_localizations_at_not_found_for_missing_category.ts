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
 * Validate behavior of localized category lookup when the category is missing
 * vs. when it exists.
 *
 * Business intent
 *
 * - Public storefront clients use GET
 *   /shoppingMall/categories/{categoryId}/localizations/{locale} to fetch
 *   localized labels and SEO metadata for category navigation.
 * - When the categoryId does not correspond to any record in
 *   shopping_mall_categories, the backend should treat this as a category-level
 *   not-found condition.
 * - When the category exists and has a localization for the requested locale, the
 *   endpoint should succeed and return the corresponding
 *   IShoppingMallCategoryLocalization record.
 *
 * Steps
 *
 * 1. Generate a random UUID that will serve as a non-existent categoryId for this
 *    test. We simply ensure that this test does not create a category with this
 *    id; collision probability is negligible.
 * 2. Choose a deterministic test locale string such as "en-US" for
 *    reproducibility.
 * 3. From the incoming public connection, attempt to GET the localization for the
 *    non-existent categoryId and locale using
 *    api.functional.shoppingMall.categories.localizations.at.
 *
 *    - Expect the call to fail; wrap it with TestValidator.error to assert an error
 *         is thrown. We do not assert on HTTP status codes directly.
 * 4. Establish an admin context by calling api.functional.auth.admin.join with a
 *    body satisfying IShoppingMallAdminJoin.ICreate, generated via
 *    typia.random.
 *
 *    - The SDK will automatically attach the admin's access token to
 *         connection.headers.
 *    - Assert the returned IShoppingMallAdmin.IAuthorized with typia.assert.
 * 5. Create a real category by calling
 *    api.functional.shoppingMall.admin.categories.create with a body satisfying
 *    IShoppingMallCategory.ICreate (again generated via typia.random for valid
 *    data).
 *
 *    - Assert the response as IShoppingMallCategory and capture its id.
 * 6. Create a localization for that category via
 *    api.functional.shoppingMall.admin.categories.localizations.create, passing
 *    categoryId: createdCategory.id and a body satisfying
 *    IShoppingMallCategoryLocalization.ICreate.
 *
 *    - Assert the response and capture the localization id and locale.
 * 7. Call the public GET endpoint again for the existing category and the created
 *    localization's locale.
 *
 *    - Assert the response as IShoppingMallCategoryLocalization.
 *    - Use TestValidator.equals to verify that the fetched localization id and
 *         locale match the ones returned by the create-localization call.
 *    - Optionally also compare a core presentation field such as name for equality.
 * 8. (Optional) To further highlight the distinction between missing category and
 *    missing localization, attempt another GET using the valid category id but
 *    a different, non-existent locale string, and assert that it fails with
 *    TestValidator.error.
 */
export async function test_api_category_localizations_at_not_found_for_missing_category(
  connection: api.IConnection,
) {
  // 1. Prepare a non-existent categoryId and a deterministic locale.
  const missingCategoryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const locale: string = "en-US";

  // 2. Expect an error when requesting localization for the non-existent category.
  await TestValidator.error(
    "missing category should cause localization GET to fail",
    async () => {
      await api.functional.shoppingMall.categories.localizations.at(
        connection,
        {
          categoryId: missingCategoryId,
          locale,
        },
      );
    },
  );

  // 3. Join as admin to gain authorization for category and localization creation.
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: typia.random<IShoppingMallAdminJoin.ICreate>(),
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 4. Create a real category using admin privileges.
  const createdCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: typia.random<IShoppingMallCategory.ICreate>(),
    });
  typia.assert<IShoppingMallCategory>(createdCategory);

  // 5. Create a localization for the newly created category.
  const createdLocalization: IShoppingMallCategoryLocalization =
    await api.functional.shoppingMall.admin.categories.localizations.create(
      connection,
      {
        categoryId: createdCategory.id,
        body: typia.random<IShoppingMallCategoryLocalization.ICreate>(),
      },
    );
  typia.assert<IShoppingMallCategoryLocalization>(createdLocalization);

  // 6. Fetch the localization through the public GET endpoint and validate it.
  const fetchedLocalization: IShoppingMallCategoryLocalization =
    await api.functional.shoppingMall.categories.localizations.at(connection, {
      categoryId: createdCategory.id,
      locale: createdLocalization.locale,
    });
  typia.assert<IShoppingMallCategoryLocalization>(fetchedLocalization);

  TestValidator.equals(
    "fetched localization id should match created localization id",
    fetchedLocalization.id,
    createdLocalization.id,
  );

  TestValidator.equals(
    "fetched localization locale should match created localization locale",
    fetchedLocalization.locale,
    createdLocalization.locale,
  );

  TestValidator.equals(
    "fetched localization name should match created localization name",
    fetchedLocalization.name,
    createdLocalization.name,
  );

  // 7. Optional: verify missing localization for an existing category but different locale.
  const otherLocale: string = "fr-FR";
  if (otherLocale !== createdLocalization.locale) {
    await TestValidator.error(
      "existing category with non-existent locale should fail",
      async () => {
        await api.functional.shoppingMall.categories.localizations.at(
          connection,
          {
            categoryId: createdCategory.id,
            locale: otherLocale,
          },
        );
      },
    );
  }
}
