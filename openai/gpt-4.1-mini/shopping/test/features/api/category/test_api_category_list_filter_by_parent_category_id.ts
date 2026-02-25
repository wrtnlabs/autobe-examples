import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCategory";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_category_list_filter_by_parent_category_id(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as administrator using join
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: { password: "strongpassword123" },
  });
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = `Bearer ${adminAuthorized.token.access}`;
  // Fetch all categories without filter to identify a parentCategoryId with subcategories
  const allCategoriesResponse =
    await api.functional.shoppingMall.administrator.categories.index(
      adminConnection,
      {
        body: {},
      },
    );
  typia.assert(allCategoriesResponse);
  // Extract all subcategories by filtering categories that have a parentCategoryId
  const subcategories = allCategoriesResponse.data.filter(
    (category) =>
      category.parentCategory !== null && category.deleted_at === null,
  );
  // Determine a valid parentCategoryId for testing with subcategories
  const validParentCategoryId =
    subcategories.length > 0 ? subcategories[0].parentCategory!.id : undefined;
  // Test case: valid parentCategoryId filtering
  if (validParentCategoryId !== undefined) {
    const filteredResponse =
      await api.functional.shoppingMall.administrator.categories.index(
        adminConnection,
        {
          body: { parentCategoryId: validParentCategoryId },
        },
      );
    typia.assert(filteredResponse);
    // All returned categories should have this parentCategoryId, no deleted
    for (const category of filteredResponse.data) {
      TestValidator.equals(
        "parentCategoryId match",
        category.parentCategory?.id ?? null,
        validParentCategoryId,
      );
      TestValidator.predicate(
        "category not deleted",
        category.deleted_at === null,
      );
      // Check essential fields presence
      TestValidator.predicate(
        "category has id",
        typeof category.id === "string",
      );
      TestValidator.predicate(
        "category has name",
        typeof category.name === "string",
      );
      TestValidator.predicate(
        "category has description",
        typeof category.description === "string",
      );
    }
    // Validate pagination metadata matches the counts
    TestValidator.predicate(
      "pagination current page >= 1",
      filteredResponse.pagination.current >= 1,
    );
    TestValidator.predicate(
      "pagination limit > 0",
      filteredResponse.pagination.limit > 0,
    );
    TestValidator.predicate(
      "pagination records >= data length",
      filteredResponse.pagination.records >= filteredResponse.data.length,
    );
  } else {
    // No valid parentCategoryId found with subcategories, ensure the test still passes innocently
    const filteredResponse =
      await api.functional.shoppingMall.administrator.categories.index(
        adminConnection,
        {
          body: { parentCategoryId: null },
        },
      );
    typia.assert(filteredResponse);
    TestValidator.predicate(
      "response data empty",
      filteredResponse.data.length === 0,
    );
  }
  // Test edge case: parentCategoryId with no subcategories
  // For this, find a category id that no other category has as parent
  const allCategoryIds = allCategoriesResponse.data.map((c) => c.id);
  const parentIds = new Set(
    allCategoriesResponse.data
      .map((c) => c.parentCategory?.id)
      .filter((id) => id !== null),
  );
  const noSubcategoryParentId = allCategoryIds.find((id) => !parentIds.has(id));
  if (noSubcategoryParentId) {
    const noSubResult =
      await api.functional.shoppingMall.administrator.categories.index(
        adminConnection,
        {
          body: { parentCategoryId: noSubcategoryParentId },
        },
      );
    typia.assert(noSubResult);
    TestValidator.predicate(
      "no subcategories data empty",
      noSubResult.data.length === 0,
    );
    TestValidator.equals(
      "pagination records zero",
      noSubResult.pagination.records,
      0,
    );
  }
  // Test edge case: invalid parentCategoryId
  const invalidId = "00000000-0000-0000-0000-000000000000";
  const invalidResult =
    await api.functional.shoppingMall.administrator.categories.index(
      adminConnection,
      {
        body: { parentCategoryId: invalidId },
      },
    );
  typia.assert(invalidResult);
  // Expect empty data array for invalid parentCategoryId
  TestValidator.predicate(
    "invalid parentCategoryId returns empty data",
    invalidResult.data.length === 0,
  );
  TestValidator.predicate(
    "invalid parentCategoryId returns zero records",
    invalidResult.pagination.records === 0,
  );
}
