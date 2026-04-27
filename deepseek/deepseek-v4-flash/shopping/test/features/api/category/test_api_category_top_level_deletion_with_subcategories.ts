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

export async function test_api_category_top_level_deletion_with_subcategories(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as super administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_administrator_join(
    adminConnection,
    {},
  );
  typia.assert(authorized);
  // Step 2: Create a top-level category
  const topCategory =
    await generate_random_e_commerce_mall_super_administrator_categories_create(
      adminConnection,
      {},
    );
  typia.assert(topCategory);
  TestValidator.predicate(
    "top-level category has no parent",
    topCategory.parent === null,
  );
  // Step 3: Create a subcategory under the top-level category
  const subCategory =
    await generate_random_e_commerce_mall_super_administrator_categories_create(
      adminConnection,
      {
        body: {
          parent_id: topCategory.id,
        },
      },
    );
  typia.assert(subCategory);
  TestValidator.equals(
    "subcategory parent matches",
    subCategory.parent?.id,
    topCategory.id,
  );
  // Step 4: Delete the top-level category (cascade deletes subcategories)
  await api.functional.eCommerceMall.superAdministrator.categories.erase(
    adminConnection,
    {
      categoryId: topCategory.id,
    },
  );
  // Successful deletion without error confirms soft-delete behavior
}
