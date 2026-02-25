import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
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

export async function test_api_shopping_mall_admin_subcategory_creation_with_parent(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: "admin@test.com",
    password: "1234" as string & tags.Format<"password">,
  } satisfies IShoppingMallAdmin.IJoin;
  // Authorize admin
  await authorize_admin_join(adminConnection, { body: adminCredentials });
  // Create root category first (parent_category_id is null)
  const rootCategory =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: "Root Category " + RandomGenerator.name(),
          description: "Root category description",
          parent_category_id: null,
        } satisfies IShoppingMallCategory.ICreate,
      },
    );
  typia.assert(rootCategory);
  // Create subcategory under the root category
  const subcategory =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: "Subcategory " + RandomGenerator.name(),
          description: "Subcategory description",
          parent_category_id: rootCategory.id,
        } satisfies IShoppingMallCategory.ICreate,
      },
    );
  typia.assert(subcategory);
  // Validate subcategory has correct parent reference
  TestValidator.equals(
    "parent_category_id matches",
    subcategory.parent_category?.id,
    rootCategory.id,
  );
  TestValidator.equals(
    "parent_category name matches",
    subcategory.parent_category?.name,
    rootCategory.name,
  );
  TestValidator.equals(
    "parent_category description matches",
    subcategory.parent_category?.description,
    rootCategory.description,
  );
}
