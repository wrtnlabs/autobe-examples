import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductSubcategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSubcategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_shopping_mall_administrator_product_categories_create } from "../../../generate/generate_random_shopping_mall_administrator_product_categories_create";
import { generate_random_shopping_mall_administrator_product_categories_subcategories_create_subcategory } from "../../../generate/generate_random_shopping_mall_administrator_product_categories_subcategories_create_subcategory";
import { prepare_random_shopping_mall_product_category } from "../../../prepare/prepare_random_shopping_mall_product_category";
import { prepare_random_shopping_mall_product_subcategory } from "../../../prepare/prepare_random_shopping_mall_product_subcategory";

export async function test_api_product_subcategory_creation_success_and_conflict_and_invalid_category(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Test product subcategory creation success, conflict and invalid category handling
  // 1. Administrator join for authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {} satisfies IShoppingMallAdministrator.IJoin,
  });
  adminConnection.headers = {
    Authorization: adminAuthorized.token.access,
  };
  // 2. Create a product category
  const category =
    await generate_random_shopping_mall_administrator_product_categories_create(
      adminConnection,
      { body: undefined },
    );
  // 3. Create a product subcategory under the created category with a random name and description
  // Since DTOs have no properties, we cannot verify fields, just create and assert
  const subcategoryCreateBody = {
    ...typia.random<IShoppingMallProductSubcategory.ICreate>(),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IShoppingMallProductSubcategory.ICreate;
  const subcategory =
    await generate_random_shopping_mall_administrator_product_categories_subcategories_create_subcategory(
      adminConnection,
      {
        params: { categoryId: (category as any).id ?? "unknown" },
        body: subcategoryCreateBody,
      },
    );
  typia.assert(subcategory);
  // 4. Test uniqueness conflict by trying to create a subcategory with the same name under the same category
  await TestValidator.error(
    "subcategory name uniqueness conflict",
    async () => {
      await generate_random_shopping_mall_administrator_product_categories_subcategories_create_subcategory(
        adminConnection,
        {
          params: { categoryId: (category as any).id ?? "unknown" },
          body: {
            ...subcategoryCreateBody,
            description: RandomGenerator.paragraph({ sentences: 3 }),
          },
        },
      );
    },
  );
  // 5. Test invalid categoryId error by trying with a random fake UUID
  const fakeCategoryId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("invalid categoryId not found", async () => {
    await generate_random_shopping_mall_administrator_product_categories_subcategories_create_subcategory(
      adminConnection,
      {
        params: { categoryId: fakeCategoryId },
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallProductSubcategory.ICreate,
      },
    );
  });
}
