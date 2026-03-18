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

export async function test_api_category_update_name_description_applied_to_browsing(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  // 1) Admin authorization (join)
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2) Create a category
  const created: IShoppingMallCategory =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(created);
  const targetId = created.id;
  const originalParentId = created.parent_category_id;
  const originalName = created.name;
  const originalDescription = created.description;
  // 3) Update name & description (do not modify parent relationship)
  const updatedName = RandomGenerator.name();
  const updatedDescription = RandomGenerator.paragraph({ sentences: 2 });
  const updated: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.update(adminConnection, {
      categoryId: targetId,
      body: {
        name: updatedName,
        description: updatedDescription,
      } satisfies IShoppingMallCategory.IUpdate,
    });
  typia.assert(updated);
  // 4) Validate response fields
  TestValidator.equals("category id unchanged", updated.id, targetId);
  TestValidator.equals("name updated", updated.name, updatedName);
  TestValidator.equals(
    "description updated",
    updated.description,
    updatedDescription,
  );
  TestValidator.equals(
    "parent_category_id unchanged",
    updated.parent_category_id,
    originalParentId,
  );
  // 5) Basic business effect: must actually change text from original
  TestValidator.notEquals(
    "name changed from original",
    updated.name,
    originalName,
  );
  TestValidator.notEquals(
    "description changed from original",
    updated.description,
    originalDescription,
  );
}
