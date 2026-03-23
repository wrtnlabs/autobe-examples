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

export async function test_api_category_update_name_duplicate_within_parent(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // 2. Create parent category
  const parentCategory =
    await api.functional.ecommerceMall.admin.categories.update(
      adminConnection,
      {
        categoryId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          name: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IEcommerceMallCategory.IUpdate,
      },
    );
  typia.assert(parentCategory);
  // 3. Create two child categories under the same parent
  const category1 = await api.functional.ecommerceMall.admin.categories.update(
    adminConnection,
    {
      categoryId: typia.random<string & tags.Format<"uuid">>(),
      body: {
        name: RandomGenerator.name(2),
        parent_category_id: parentCategory.category_id,
      } satisfies IEcommerceMallCategory.IUpdate,
    },
  );
  typia.assert(category1);
  const category2 = await api.functional.ecommerceMall.admin.categories.update(
    adminConnection,
    {
      categoryId: typia.random<string & tags.Format<"uuid">>(),
      body: {
        name: RandomGenerator.name(2),
        parent_category_id: parentCategory.category_id,
      } satisfies IEcommerceMallCategory.IUpdate,
    },
  );
  typia.assert(category2);
  // 4. Attempt to update category2's name to match category1's name (should fail)
  await TestValidator.error("duplicate name within same parent", async () => {
    await api.functional.ecommerceMall.admin.categories.update(
      adminConnection,
      {
        categoryId: category2.category_id,
        body: {
          name: category1.after_name ?? category1.before_name,
        } satisfies IEcommerceMallCategory.IUpdate,
      },
    );
  });
  // 5. Update category2 with unique name within same parent (should succeed)
  const updatedCategory2 =
    await api.functional.ecommerceMall.admin.categories.update(
      adminConnection,
      {
        categoryId: category2.category_id,
        body: {
          name: RandomGenerator.name(2),
        } satisfies IEcommerceMallCategory.IUpdate,
      },
    );
  typia.assert(updatedCategory2);
  // 6. Validate the update - check name changed
  TestValidator.notEquals(
    "name differs from original",
    updatedCategory2.after_name ?? updatedCategory2.before_name,
    category2.after_name ?? category2.before_name,
  );
}
