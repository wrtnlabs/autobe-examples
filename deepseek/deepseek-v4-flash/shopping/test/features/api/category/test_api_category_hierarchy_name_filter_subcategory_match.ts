import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_category_hierarchy_name_filter_subcategory_match(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as superAdministrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_join(superAdminConnection, {});
  // 2. Create two top-level categories
  const electronics =
    await generate_random_e_commerce_mall_super_administrator_categories_create(
      superAdminConnection,
      {
        body: {
          name: "Electronics",
          description: "Electronic devices and accessories",
          parent_id: null,
        },
      },
    );
  typia.assert(electronics);
  const homeAppliances =
    await generate_random_e_commerce_mall_super_administrator_categories_create(
      superAdminConnection,
      {
        body: {
          name: "Home Appliances",
          description: "Home appliances and tools",
          parent_id: null,
        },
      },
    );
  typia.assert(homeAppliances);
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
  const laptops =
    await generate_random_e_commerce_mall_super_administrator_categories_create(
      superAdminConnection,
      {
        body: {
          name: "Laptops",
          description: "Portable computers",
          parent_id: electronics.id,
        },
      },
    );
  typia.assert(laptops);
  const vacuumCleaners =
    await generate_random_e_commerce_mall_super_administrator_categories_create(
      superAdminConnection,
      {
        body: {
          name: "Vacuum Cleaners",
          description: "Cleaning appliances",
          parent_id: homeAppliances.id,
        },
      },
    );
  typia.assert(vacuumCleaners);
  // 4. Test: Filter "smart" matches Smartphones → Electronics included, Home Appliances excluded
  const result1 =
    await api.functional.eCommerceMall.superAdministrator.categories.hierarchy.search(
      superAdminConnection,
      {
        body: {
          name: "smart",
        } satisfies IECommerceMallCategory.IHierarchyRequest,
      },
    );
  typia.assert(result1);
  TestValidator.equals(
    "search 'smart' returns exactly one top-level category",
    result1.topLevelCategories.length,
    1,
  );
  TestValidator.equals(
    "search 'smart' top-level category is Electronics",
    result1.topLevelCategories[0].name,
    "Electronics",
  );
  TestValidator.equals(
    "search 'smart' Electronics has only Smartphones subcategory",
    result1.topLevelCategories[0].subcategories.length,
    1,
  );
  TestValidator.equals(
    "search 'smart' subcategory is Smartphones",
    result1.topLevelCategories[0].subcategories[0].name,
    "Smartphones",
  );
  // 5. Test: Filter "phone" should also match Smartphones via partial match
  const result2 =
    await api.functional.eCommerceMall.superAdministrator.categories.hierarchy.search(
      superAdminConnection,
      {
        body: {
          name: "phone",
        } satisfies IECommerceMallCategory.IHierarchyRequest,
      },
    );
  typia.assert(result2);
  TestValidator.equals(
    "search 'phone' returns exactly one top-level category",
    result2.topLevelCategories.length,
    1,
  );
  TestValidator.equals(
    "search 'phone' top-level category is Electronics",
    result2.topLevelCategories[0].name,
    "Electronics",
  );
  TestValidator.equals(
    "search 'phone' Electronics has only Smartphones subcategory",
    result2.topLevelCategories[0].subcategories.length,
    1,
  );
  TestValidator.equals(
    "search 'phone' subcategory is Smartphones",
    result2.topLevelCategories[0].subcategories[0].name,
    "Smartphones",
  );
  // 6. Test: Filter "zzzz" matches nothing → empty result
  const result3 =
    await api.functional.eCommerceMall.superAdministrator.categories.hierarchy.search(
      superAdminConnection,
      {
        body: {
          name: "zzzz",
        } satisfies IECommerceMallCategory.IHierarchyRequest,
      },
    );
  typia.assert(result3);
  TestValidator.equals(
    "search 'zzzz' returns no top-level categories",
    result3.topLevelCategories.length,
    0,
  );
}
