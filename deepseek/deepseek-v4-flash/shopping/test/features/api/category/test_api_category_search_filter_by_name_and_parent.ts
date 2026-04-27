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

export async function test_api_category_search_filter_by_name_and_parent(
  connection: api.IConnection,
): Promise<void> {
  // ---- Setup ----
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = {
    host: connection.host,
  };
  const superAdminAuth = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  typia.assert(superAdminAuth);
  // 2. Create top-level categories
  // Electronics (older) will be created first, Clothing (newer) second
  const electronics =
    await generate_random_e_commerce_mall_super_administrator_categories_create(
      superAdminConnection,
      {
        body: {
          name: "Electronics",
          description: "Electronic devices and accessories",
        },
      },
    );
  typia.assert(electronics);
  const clothing =
    await generate_random_e_commerce_mall_super_administrator_categories_create(
      superAdminConnection,
      {
        body: {
          name: "Clothing",
          description: "Apparel and fashion items",
        },
      },
    );
  typia.assert(clothing);
  // 3. Create subcategories
  const smartphones =
    await generate_random_e_commerce_mall_super_administrator_categories_create(
      superAdminConnection,
      {
        body: {
          name: "Smartphones",
          description: "Mobile phones and accessories",
          parent_id: electronics.id,
        },
      },
    );
  typia.assert(smartphones);
  const shoes =
    await generate_random_e_commerce_mall_super_administrator_categories_create(
      superAdminConnection,
      {
        body: {
          name: "Shoes",
          description: "Footwear for all occasions",
          parent_id: clothing.id,
        },
      },
    );
  typia.assert(shoes);
  // ---- Test Scenarios ----
  // (1) Search by partial name match
  const searchResult =
    await api.functional.eCommerceMall.superAdministrator.categories.index(
      superAdminConnection,
      {
        body: {
          search: "phone",
        },
      },
    );
  typia.assert(searchResult);
  TestValidator.equals(
    "search 'phone' returns 1 category",
    searchResult.data.length,
    1,
  );
  TestValidator.equals(
    "search 'phone' returns Smartphones",
    searchResult.data[0]!.name,
    "Smartphones",
  );
  // (2) Filter by parent_id=null (top-level categories only)
  // Ordered by created_at DESC: Clothing (newer) first, Electronics (older) second
  const topLevelResult =
    await api.functional.eCommerceMall.superAdministrator.categories.index(
      superAdminConnection,
      {
        body: {
          parent_id: null,
        },
      },
    );
  typia.assert(topLevelResult);
  TestValidator.equals(
    "top-level categories count",
    topLevelResult.data.length,
    2,
  );
  TestValidator.equals(
    "top-level result name at [0]",
    topLevelResult.data[0]!.name,
    "Clothing",
  );
  TestValidator.equals(
    "top-level result name at [1]",
    topLevelResult.data[1]!.name,
    "Electronics",
  );
  // Verify parent is null for top-level categories
  TestValidator.equals(
    "top-level category has null parent",
    topLevelResult.data[0]!.parent,
    null,
  );
  TestValidator.equals(
    "top-level category has null parent",
    topLevelResult.data[1]!.parent,
    null,
  );
  // (3) Filter by specific parent UUID
  const subcategoriesResult =
    await api.functional.eCommerceMall.superAdministrator.categories.index(
      superAdminConnection,
      {
        body: {
          parent_id: electronics.id,
        },
      },
    );
  typia.assert(subcategoriesResult);
  TestValidator.equals(
    "Electronics subcategories count",
    subcategoriesResult.data.length,
    1,
  );
  TestValidator.equals(
    "Electronics subcategory is Smartphones",
    subcategoriesResult.data[0]!.name,
    "Smartphones",
  );
  // Verify parent reference is populated
  const smartphoneParent = subcategoriesResult.data[0]!.parent!;
  TestValidator.equals(
    "Smartphones parent_id matches Electronics",
    smartphoneParent.id,
    electronics.id,
  );
  TestValidator.equals(
    "Smartphones parent_name matches",
    smartphoneParent.name,
    "Electronics",
  );
  // (4) Pagination: page=1, limit=1 (top-level only)
  const page1Result =
    await api.functional.eCommerceMall.superAdministrator.categories.index(
      superAdminConnection,
      {
        body: {
          parent_id: null,
          page: 1,
          limit: 1,
        },
      },
    );
  typia.assert(page1Result);
  TestValidator.equals("page 1 data length", page1Result.data.length, 1);
  TestValidator.equals(
    "page 1 pagination current",
    page1Result.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 pagination records",
    page1Result.pagination.records,
    2,
  );
  TestValidator.equals(
    "page 1 pagination pages",
    page1Result.pagination.pages,
    2,
  );
  // page=1 returns Clothing (newest first with created_at DESC)
  TestValidator.equals(
    "page 1 first result is Clothing",
    page1Result.data[0]!.name,
    "Clothing",
  );
  // Pagination: page=2, limit=1 (top-level only)
  const page2Result =
    await api.functional.eCommerceMall.superAdministrator.categories.index(
      superAdminConnection,
      {
        body: {
          parent_id: null,
          page: 2,
          limit: 1,
        },
      },
    );
  typia.assert(page2Result);
  TestValidator.equals("page 2 data length", page2Result.data.length, 1);
  TestValidator.equals(
    "page 2 pagination current",
    page2Result.pagination.current,
    2,
  );
  // page=2 returns Electronics (second oldest)
  TestValidator.equals(
    "page 2 result is Electronics",
    page2Result.data[0]!.name,
    "Electronics",
  );
  // (5) Search combined with pagination
  const searchPageResult =
    await api.functional.eCommerceMall.superAdministrator.categories.index(
      superAdminConnection,
      {
        body: {
          search: "phone",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(searchPageResult);
  TestValidator.equals(
    "search + pagination data length",
    searchPageResult.data.length,
    1,
  );
  TestValidator.equals(
    "search + pagination records",
    searchPageResult.pagination.records,
    1,
  );
  TestValidator.equals(
    "search + pagination pages",
    searchPageResult.pagination.pages,
    1,
  );
  TestValidator.equals(
    "search + pagination name",
    searchPageResult.data[0]!.name,
    "Smartphones",
  );
  // (6) Non-existent UUID as parent_id
  const nonExistentParentId = typia.random<string & tags.Format<"uuid">>();
  const emptyResult =
    await api.functional.eCommerceMall.superAdministrator.categories.index(
      superAdminConnection,
      {
        body: {
          parent_id: nonExistentParentId,
        },
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "non-existent parent returns empty data",
    emptyResult.data.length,
    0,
  );
  TestValidator.equals(
    "non-existent parent records=0",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "non-existent parent pages=0",
    emptyResult.pagination.pages,
    0,
  );
}
