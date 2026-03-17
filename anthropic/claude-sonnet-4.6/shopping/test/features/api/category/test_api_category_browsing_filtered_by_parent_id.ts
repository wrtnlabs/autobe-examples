import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCategory";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfCustomer";
import type { IShoppingMallAdminOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfSeller";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";

export async function test_api_category_browsing_filtered_by_parent_id(
  connection: api.IConnection,
): Promise<void> {
  // ─── Setup: Admin connection ───────────────────────────────────────────────
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // ─── Create top-level categories ──────────────────────────────────────────
  const electronics =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          parent_id: null,
          name: "Electronics",
          description: "Electronic devices and accessories",
        },
      },
    );
  typia.assert(electronics);
  const clothing = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        parent_id: null,
        name: "Clothing",
        description: "Fashion and apparel",
      },
    },
  );
  typia.assert(clothing);
  // ─── Create subcategories under Electronics ────────────────────────────────
  const phones = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        parent_id: electronics.id,
        name: "Phones",
        description: "Smartphones and mobile devices",
      },
    },
  );
  typia.assert(phones);
  const laptops = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        parent_id: electronics.id,
        name: "Laptops",
        description: "Laptop computers",
      },
    },
  );
  typia.assert(laptops);
  // ─── Create subcategory under Clothing ────────────────────────────────────
  const shoes = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        parent_id: clothing.id,
        name: "Shoes",
        description: "Footwear",
      },
    },
  );
  typia.assert(shoes);
  // ─── Public connection (no auth needed for browsing) ──────────────────────
  const publicConnection: api.IConnection = { host: connection.host };
  // ─── Part A: parentId = null → only top-level categories ──────────────────
  const topLevelResult = await api.functional.shoppingMall.categories.index(
    publicConnection,
    {
      body: {
        parentId: null,
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(topLevelResult);
  // Verify all returned items in data are top-level (parent_id === null)
  TestValidator.predicate(
    "all returned data items are top-level categories",
    () => topLevelResult.data.every((cat) => cat.parent_id === null),
  );
  // Verify Electronics and Clothing appear in the results
  const topLevelIds = topLevelResult.data.map((cat) => cat.id);
  TestValidator.predicate("Electronics appears in top-level results", () =>
    topLevelIds.includes(electronics.id),
  );
  TestValidator.predicate("Clothing appears in top-level results", () =>
    topLevelIds.includes(clothing.id),
  );
  // Verify subcategories (Phones, Laptops, Shoes) are NOT standalone items in data
  TestValidator.predicate(
    "Phones is not a standalone item in top-level results",
    () => !topLevelIds.includes(phones.id),
  );
  TestValidator.predicate(
    "Laptops is not a standalone item in top-level results",
    () => !topLevelIds.includes(laptops.id),
  );
  TestValidator.predicate(
    "Shoes is not a standalone item in top-level results",
    () => !topLevelIds.includes(shoes.id),
  );
  // Verify Electronics has its children (Phones, Laptops)
  const electronicsInResult = topLevelResult.data.find(
    (cat) => cat.id === electronics.id,
  );
  TestValidator.predicate(
    "Electronics has children populated",
    () =>
      electronicsInResult !== undefined &&
      electronicsInResult.children.length >= 2,
  );
  TestValidator.predicate(
    "Electronics children include Phones",
    () =>
      electronicsInResult !== undefined &&
      electronicsInResult.children.some((c) => c.id === phones.id),
  );
  TestValidator.predicate(
    "Electronics children include Laptops",
    () =>
      electronicsInResult !== undefined &&
      electronicsInResult.children.some((c) => c.id === laptops.id),
  );
  // Verify Clothing has its children (Shoes)
  const clothingInResult = topLevelResult.data.find(
    (cat) => cat.id === clothing.id,
  );
  TestValidator.predicate(
    "Clothing has children populated",
    () =>
      clothingInResult !== undefined && clothingInResult.children.length >= 1,
  );
  TestValidator.predicate(
    "Clothing children include Shoes",
    () =>
      clothingInResult !== undefined &&
      clothingInResult.children.some((c) => c.id === shoes.id),
  );
  // ─── Part B: parentId = electronics.id → subcategories of Electronics only ─
  const electronicsSubsResult =
    await api.functional.shoppingMall.categories.index(publicConnection, {
      body: {
        parentId: electronics.id,
      } satisfies IShoppingMallCategory.IRequest,
    });
  typia.assert(electronicsSubsResult);
  // All results should have parent_id === electronics.id
  TestValidator.predicate(
    "all returned subcategories belong to Electronics",
    () =>
      electronicsSubsResult.data.every(
        (cat) => cat.parent_id === electronics.id,
      ),
  );
  const electronicsSubIds = electronicsSubsResult.data.map((cat) => cat.id);
  TestValidator.predicate("Phones appears in Electronics subcategories", () =>
    electronicsSubIds.includes(phones.id),
  );
  TestValidator.predicate("Laptops appears in Electronics subcategories", () =>
    electronicsSubIds.includes(laptops.id),
  );
  TestValidator.predicate(
    "Clothing does not appear in Electronics subcategories",
    () => !electronicsSubIds.includes(clothing.id),
  );
  TestValidator.predicate(
    "Shoes does not appear in Electronics subcategories",
    () => !electronicsSubIds.includes(shoes.id),
  );
  // Subcategories should have empty children arrays (two-tier max)
  TestValidator.predicate(
    "Electronics subcategories have empty children arrays",
    () => electronicsSubsResult.data.every((cat) => cat.children.length === 0),
  );
  // ─── Part C: no parentId → all categories ────────────────────────────────
  const allCategoriesResult =
    await api.functional.shoppingMall.categories.index(publicConnection, {
      body: {} satisfies IShoppingMallCategory.IRequest,
    });
  typia.assert(allCategoriesResult);
  // Total records should be >= 5 (2 top-level + 3 subcategories at minimum)
  TestValidator.predicate(
    "pagination records reflect all created categories",
    () => allCategoriesResult.pagination.records >= 5,
  );
  // ─── Sort test: sort by name ascending ────────────────────────────────────
  const sortedByNameAsc = await api.functional.shoppingMall.categories.index(
    publicConnection,
    {
      body: {
        parentId: null,
        sort: "name",
        order: "asc",
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(sortedByNameAsc);
  // Verify ascending alphabetical ordering by name
  const sortedNames = sortedByNameAsc.data.map((cat) => cat.name);
  TestValidator.predicate(
    "top-level categories are sorted by name ascending",
    () =>
      sortedNames.every(
        (name, index) =>
          index === 0 || name.localeCompare(sortedNames[index - 1]!) >= 0,
      ),
  );
  // Sort descending
  const sortedByNameDesc = await api.functional.shoppingMall.categories.index(
    publicConnection,
    {
      body: {
        parentId: null,
        sort: "name",
        order: "desc",
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(sortedByNameDesc);
  const sortedNamesDesc = sortedByNameDesc.data.map((cat) => cat.name);
  TestValidator.predicate(
    "top-level categories are sorted by name descending",
    () =>
      sortedNamesDesc.every(
        (name, index) =>
          index === 0 || name.localeCompare(sortedNamesDesc[index - 1]!) <= 0,
      ),
  );
}
