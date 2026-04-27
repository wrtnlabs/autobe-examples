import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_e_commerce_mall_super_administrator_categories_create } from "../../../generate/generate_random_e_commerce_mall_super_administrator_categories_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";

export async function test_api_category_hierarchy_browsing_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  typia.assert(auth);
  // 2. Create a top-level category
  const topLevel =
    await generate_random_e_commerce_mall_super_administrator_categories_create(
      superAdminConnection,
      { body: { parent_id: null } },
    );
  typia.assert(topLevel);
  TestValidator.predicate(
    "top-level category parent is null",
    topLevel.parent === null,
  );
  // 3. Create a subcategory under the top-level category
  const subCategory =
    await generate_random_e_commerce_mall_super_administrator_categories_create(
      superAdminConnection,
      { body: { parent_id: topLevel.id } },
    );
  typia.assert(subCategory);
  TestValidator.predicate(
    "subcategory has a parent",
    subCategory.parent !== null,
  );
  TestValidator.equals(
    "subcategory parent id matches top-level category id",
    subCategory.parent!.id,
    topLevel.id,
  );
  // 4. Soft-delete the subcategory
  await api.functional.eCommerceMall.superAdministrator.categories.erase(
    superAdminConnection,
    { categoryId: subCategory.id },
  );
  // 5. Browse without any filters (default) — only active categories
  const defaultPage =
    await api.functional.eCommerceMall.superAdministrator.categories.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IECommerceMallCategory.IRequest,
      },
    );
  typia.assert(defaultPage);
  // Top-level category should be present
  const defaultTopLevel = defaultPage.data.find((c) => c.id === topLevel.id);
  TestValidator.predicate(
    "top-level category present in default browse",
    defaultTopLevel !== undefined,
  );
  // Deleted subcategory should NOT appear
  const defaultDeleted = defaultPage.data.find((c) => c.id === subCategory.id);
  TestValidator.predicate(
    "deleted subcategory absent in default browse",
    defaultDeleted === undefined,
  );
  // 6. Browse with include_deleted=true — deleted subcategory appears
  const includeDeletedPage =
    await api.functional.eCommerceMall.superAdministrator.categories.index(
      superAdminConnection,
      {
        body: {
          include_deleted: true,
          page: 1,
          limit: 100,
        } satisfies IECommerceMallCategory.IRequest,
      },
    );
  typia.assert(includeDeletedPage);
  // Deleted subcategory should now appear
  const foundDeleted = includeDeletedPage.data.find(
    (c) => c.id === subCategory.id,
  );
  TestValidator.predicate(
    "deleted subcategory found with include_deleted=true",
    foundDeleted !== undefined,
  );
  TestValidator.predicate(
    "deleted subcategory has non-null deleted_at",
    foundDeleted!.deleted_at !== null,
  );
  // 7. Browse with include_deleted=false — same as default
  const excludeDeletedPage =
    await api.functional.eCommerceMall.superAdministrator.categories.index(
      superAdminConnection,
      {
        body: {
          include_deleted: false,
          page: 1,
          limit: 100,
        } satisfies IECommerceMallCategory.IRequest,
      },
    );
  typia.assert(excludeDeletedPage);
  const excludeDeleted = excludeDeletedPage.data.find(
    (c) => c.id === subCategory.id,
  );
  TestValidator.predicate(
    "deleted subcategory absent with include_deleted=false",
    excludeDeleted === undefined,
  );
  // 8. Verify hierarchy structure — all records have required fields
  for (const cat of defaultPage.data) {
    TestValidator.predicate(
      `category ${cat.id} has valid id`,
      typeof cat.id === "string",
    );
    TestValidator.predicate(
      `category ${cat.id} has name`,
      typeof cat.name === "string",
    );
    TestValidator.predicate(
      `category ${cat.id} has description`,
      typeof cat.description === "string",
    );
    TestValidator.predicate(
      `category ${cat.id} has created_at`,
      typeof cat.created_at === "string",
    );
    TestValidator.predicate(
      `category ${cat.id} has updated_at`,
      typeof cat.updated_at === "string",
    );
    TestValidator.predicate(
      `category ${cat.id} deleted_at is null or string`,
      cat.deleted_at === null || typeof cat.deleted_at === "string",
    );
    TestValidator.predicate(
      `category ${cat.id} has subcategories array`,
      Array.isArray(cat.subcategories),
    );
  }
  // 9. Verify pagination metadata
  TestValidator.predicate(
    "pagination current >= 1",
    defaultPage.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit >= 1",
    defaultPage.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    defaultPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    defaultPage.pagination.pages >= 0,
  );
  // Verify parent reference hierarchy on the deleted subcategory
  if (foundDeleted) {
    TestValidator.predicate(
      "deleted subcategory has parent reference",
      foundDeleted.parent !== null,
    );
    TestValidator.equals(
      "deleted subcategory parent id matches",
      foundDeleted.parent!.id,
      topLevel.id,
    );
  }
}
