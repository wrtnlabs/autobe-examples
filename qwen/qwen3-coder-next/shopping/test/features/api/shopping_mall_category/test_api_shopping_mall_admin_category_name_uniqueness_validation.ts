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

export async function test_api_shopping_mall_admin_category_name_uniqueness_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins the system
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "1234" satisfies string & tags.Format<"password">,
  } satisfies IShoppingMallAdmin.IJoin;
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: adminCredentials,
  });
  typia.assert(adminAuthorized);
  // Create actor-specific connection with authorization token
  const adminTokenConnection: api.IConnection = {
    host: connection.host,
    headers: {
      authorization: adminAuthorized.token.access,
    },
  };
  // 2. Admin creates a root category with specific name
  const categoryName = RandomGenerator.name();
  const firstCategory =
    await api.functional.shoppingMall.admin.categories.create(
      adminTokenConnection,
      {
        body: {
          name: categoryName,
        } satisfies IShoppingMallCategory.ICreate,
      },
    );
  typia.assert(firstCategory);
  // 3. Admin attempts to create another root category with same name
  // 4. Verify creation fails with appropriate error
  await TestValidator.error("duplicate category name should fail", async () => {
    await api.functional.shoppingMall.admin.categories.create(
      adminTokenConnection,
      {
        body: {
          name: categoryName,
        } satisfies IShoppingMallCategory.ICreate,
      },
    );
  });
  // 5. Verify database contains only one category with that name
  // (In real implementation, we would query categories and verify count)
}
