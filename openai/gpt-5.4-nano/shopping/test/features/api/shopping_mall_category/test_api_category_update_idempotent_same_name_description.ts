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

export async function test_api_category_update_idempotent_same_name_description(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  const created: IShoppingMallCategory =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(created);
  const updated: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.update(adminConnection, {
      categoryId: created.id,
      body: {
        name: created.name,
        description: created.description,
      } satisfies IShoppingMallCategory.IUpdate,
    });
  typia.assert(updated);
  TestValidator.equals("category id preserved", updated.id, created.id);
  TestValidator.equals("name unchanged", updated.name, created.name);
  TestValidator.equals(
    "description unchanged",
    updated.description,
    created.description,
  );
  TestValidator.equals(
    "parent_category_id unchanged",
    updated.parent_category_id,
    created.parent_category_id,
  );
  TestValidator.predicate(
    "updated_at not earlier than created_at",
    Date.parse(updated.updated_at) >= Date.parse(created.updated_at),
  );
}
