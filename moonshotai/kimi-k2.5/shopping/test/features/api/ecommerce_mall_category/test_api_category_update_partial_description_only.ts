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
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";

export async function test_api_category_update_partial_description_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {} satisfies DeepPartial<IEcommerceMallAdmin.IJoin>,
  });
  // 2. Create a category with initial name and description
  const originalName = RandomGenerator.name(3);
  const originalDescription = RandomGenerator.paragraph({ sentences: 3 });
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: originalName,
        description: originalDescription,
      } satisfies DeepPartial<IEcommerceMallCategory.ICreate>,
    },
  );
  typia.assert(category);
  // 3. Partial update - only description, omitting name
  const newDescription = RandomGenerator.paragraph({ sentences: 5 });
  const updatedCategory =
    await api.functional.ecommerceMall.admin.categories.update(
      adminConnection,
      {
        categoryId: category.id,
        body: {
          description: newDescription,
        } satisfies IEcommerceMallCategory.IUpdate,
      },
    );
  typia.assert(updatedCategory);
  // 4. Validate response - name should be unchanged, description should be updated
  TestValidator.equals(
    "name remains unchanged after partial update",
    updatedCategory.name,
    originalName,
  );
  TestValidator.equals(
    "description is updated to new value",
    updatedCategory.description,
    newDescription,
  );
}
