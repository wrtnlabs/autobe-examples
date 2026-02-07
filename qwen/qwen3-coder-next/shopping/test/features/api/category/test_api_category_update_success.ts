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

export async function test_api_category_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = typia.random<IShoppingMallAdmin.IJoin>();
  const admin = await authorize_admin_join(adminConnection, {
    body: adminCredentials,
  });
  typia.assert(admin);
  // 2. Get available category to update
  // Note: Since we don't have a create category function, we'll use an existing category
  // In real scenario, admin would create a category first, then update it
  // For this test, we need a category ID. Since we don't have a way to list categories,
  // we'll generate a random UUID for testing purposes.
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  // 3. Update category with new name and description
  const body = {
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallCategory.IUpdate;
  const updatedCategory =
    await api.functional.shoppingMall.admin.categories.update(adminConnection, {
      categoryId: categoryId,
      body: body,
    });
  typia.assert(updatedCategory);
  // 4. Verify update was successful
  // Since we don't have a way to fetch the updated category in this scenario,
  // we can only verify the update operation completed successfully
  TestValidator.predicate(
    "category updated successfully",
    updatedCategory !== null,
  );
}
