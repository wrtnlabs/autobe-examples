import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_e_commerce_mall_administrator_categories_create } from "../../../generate/generate_random_e_commerce_mall_administrator_categories_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";

export async function test_api_category_hierarchy_name_search_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  // 2. Create top-level categories
  const electronics =
    await generate_random_e_commerce_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: "Electronics",
          description: "Electronic devices and accessories",
        },
      },
    );
  typia.assert(electronics);
  const homeGarden =
    await generate_random_e_commerce_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: "Home & Garden",
          description: "Home and garden products",
        },
      },
    );
  typia.assert(homeGarden);
  // 3. Create subcategories
  const smartphones =
    await generate_random_e_commerce_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: "Smartphones",
          description: "Smartphone devices",
          parent_id: electronics.id,
        },
      },
    );
  typia.assert(smartphones);
  const smartHomeDevices =
    await generate_random_e_commerce_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: "Smart Home Devices",
          description: "Smart home automation products",
          parent_id: homeGarden.id,
        },
      },
    );
  typia.assert(smartHomeDevices);
  // 4. Test: search by "smart" (lowercase partial match)
  const resultSmart =
    await api.functional.eCommerceMall.administrator.categories.hierarchy.search(
      adminConnection,
      {
        body: {
          name: "smart",
        } satisfies IECommerceMallCategory.IHierarchyRequest,
      },
    );
  typia.assert(resultSmart);
  TestValidator.equals(
    "should return 2 top-level categories when filtering by 'smart'",
    resultSmart.topLevelCategories.length,
    2,
  );
  const electronicsNode = resultSmart.topLevelCategories.find(
    (c) => c.name === "Electronics",
  );
  TestValidator.predicate(
    "Electronics should be included",
    electronicsNode !== undefined,
  );
  TestValidator.equals(
    "Electronics should have Smartphones subcategory",
    electronicsNode!.subcategories.map((s) => s.name),
    ["Smartphones"],
  );
  const homeGardenNode = resultSmart.topLevelCategories.find(
    (c) => c.name === "Home & Garden",
  );
  TestValidator.predicate(
    "Home & Garden should be included",
    homeGardenNode !== undefined,
  );
  TestValidator.equals(
    "Home & Garden should have Smart Home Devices subcategory",
    homeGardenNode!.subcategories.map((s) => s.name),
    ["Smart Home Devices"],
  );
  // 5. Test: case-insensitive matching with "SMART" (uppercase)
  const resultSMART =
    await api.functional.eCommerceMall.administrator.categories.hierarchy.search(
      adminConnection,
      {
        body: {
          name: "SMART",
        } satisfies IECommerceMallCategory.IHierarchyRequest,
      },
    );
  typia.assert(resultSMART);
  TestValidator.equals(
    "case-insensitive: should return 2 top-level categories when filtering by 'SMART'",
    resultSMART.topLevelCategories.length,
    2,
  );
  // 6. Test: search by "nonexistent" (no match)
  const resultNonexistent =
    await api.functional.eCommerceMall.administrator.categories.hierarchy.search(
      adminConnection,
      {
        body: {
          name: "nonexistent",
        } satisfies IECommerceMallCategory.IHierarchyRequest,
      },
    );
  typia.assert(resultNonexistent);
  TestValidator.equals(
    "should return empty topLevelCategories for non-matching filter",
    resultNonexistent.topLevelCategories.length,
    0,
  );
  // 7. Test: search by "Electronics" (exact top-level name match)
  const resultElectronics =
    await api.functional.eCommerceMall.administrator.categories.hierarchy.search(
      adminConnection,
      {
        body: {
          name: "Electronics",
        } satisfies IECommerceMallCategory.IHierarchyRequest,
      },
    );
  typia.assert(resultElectronics);
  TestValidator.equals(
    "should return 1 top-level category when filtering by 'Electronics'",
    resultElectronics.topLevelCategories.length,
    1,
  );
  TestValidator.equals(
    "the category should be Electronics",
    resultElectronics.topLevelCategories[0].name,
    "Electronics",
  );
  TestValidator.equals(
    "Electronics should have Smartphones subcategory",
    resultElectronics.topLevelCategories[0].subcategories.map((s) => s.name),
    ["Smartphones"],
  );
}
