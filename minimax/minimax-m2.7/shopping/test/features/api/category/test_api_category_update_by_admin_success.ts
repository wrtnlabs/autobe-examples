import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_ecommerce_mall_admin_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_admin_categories_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";

export async function test_api_category_update_by_admin_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create a category that will be updated in the test
  const category =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 3. Prepare update data with new name and description
  const updateBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IEcommerceMallCategory.IUpdate;
  // 4. Update the category's name and description
  const updatedCategory =
    await api.functional.ecommerceMall.admin.categories.update(
      adminConnection,
      {
        categoryId: category.id,
        body: updateBody,
      },
    );
  typia.assert(updatedCategory);
  // 5. Validate the updated category entity
  TestValidator.equals(
    "category id preserved",
    updatedCategory.id,
    category.id,
  );
  TestValidator.equals("name updated", updatedCategory.name, updateBody.name);
  TestValidator.equals(
    "description updated",
    updatedCategory.description,
    updateBody.description,
  );
  TestValidator.predicate(
    "updated_at changed",
    updatedCategory.updated_at > category.updated_at,
  );
}
