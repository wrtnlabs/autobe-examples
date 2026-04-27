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

export async function test_api_category_retrieve_top_level(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_join(superAdminConnection, {});
  // 2. Create a top-level category (no parent_id)
  const category =
    await generate_random_e_commerce_mall_super_administrator_categories_create(
      superAdminConnection,
      {},
    );
  typia.assert(category);
  // 3. Retrieve the created category by ID
  const retrieved =
    await api.functional.eCommerceMall.superAdministrator.categories.at(
      superAdminConnection,
      {
        categoryId: category.id,
      },
    );
  typia.assert(retrieved);
  // 4. Validate business logic
  TestValidator.equals("category id matches", retrieved.id, category.id);
  TestValidator.equals("category name matches", retrieved.name, category.name);
  TestValidator.equals(
    "category description matches",
    retrieved.description,
    category.description,
  );
  TestValidator.predicate(
    "parent is null for top-level category",
    retrieved.parent === null,
  );
  TestValidator.predicate(
    "deleted_at is null for active category",
    retrieved.deleted_at === null,
  );
}
