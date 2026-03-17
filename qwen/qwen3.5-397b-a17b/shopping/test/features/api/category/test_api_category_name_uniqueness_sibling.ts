import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
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

export async function test_api_category_name_uniqueness_sibling(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin registration
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create first top-level category with specific name
  const categoryName = "Electronics";
  const firstCategory =
    await api.functional.shoppingMall.admin.categories.create(adminConnection, {
      body: {
        name: categoryName,
        description: "First electronics category",
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(firstCategory);
  // 3. Attempt to create another category with same name at same level (should fail)
  await TestValidator.error(
    "duplicate category name at same level",
    async () => {
      await api.functional.shoppingMall.admin.categories.create(
        adminConnection,
        {
          body: {
            name: categoryName,
            description: "Duplicate electronics category",
          } satisfies IShoppingMallCategory.ICreate,
        },
      );
    },
  );
  // 4. Create a different parent category
  const parentCategory =
    await api.functional.shoppingMall.admin.categories.create(adminConnection, {
      body: {
        name: "Home & Garden",
        description: "Home and garden products",
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(parentCategory);
  // 5. Create subcategory under first category with name "Sale"
  const saleInElectronics =
    await api.functional.shoppingMall.admin.categories.create(adminConnection, {
      body: {
        name: "Sale",
        description: "Sale items in electronics",
        parent_category_id: firstCategory.id,
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(saleInElectronics);
  // 6. Create subcategory under different parent with same name "Sale" (should succeed)
  const saleInHomeGarden =
    await api.functional.shoppingMall.admin.categories.create(adminConnection, {
      body: {
        name: "Sale",
        description: "Sale items in home and garden",
        parent_category_id: parentCategory.id,
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(saleInHomeGarden);
  // 7. Verify both "Sale" subcategories exist under different parents
  TestValidator.equals(
    "sale category names match",
    saleInElectronics.name,
    saleInHomeGarden.name,
  );
  TestValidator.notEquals(
    "sale categories have different IDs",
    saleInElectronics.id,
    saleInHomeGarden.id,
  );
  TestValidator.predicate(
    "first sale has correct parent",
    saleInElectronics.parent?.id === firstCategory.id,
  );
  TestValidator.predicate(
    "second sale has correct parent",
    saleInHomeGarden.parent?.id === parentCategory.id,
  );
  // 8. Attempt to create another "Sale" under first category (should fail - duplicate sibling)
  await TestValidator.error(
    "duplicate subcategory name under same parent",
    async () => {
      await api.functional.shoppingMall.admin.categories.create(
        adminConnection,
        {
          body: {
            name: "Sale",
            description: "Another sale in electronics",
            parent_category_id: firstCategory.id,
          } satisfies IShoppingMallCategory.ICreate,
        },
      );
    },
  );
}
