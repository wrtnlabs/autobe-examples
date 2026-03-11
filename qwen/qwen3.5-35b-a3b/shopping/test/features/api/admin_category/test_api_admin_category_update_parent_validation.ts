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

export async function test_api_admin_category_update_parent_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication - authorize_admin_join updates connection.headers internally
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuthorized);
  // 2. Create top-level category A (parent_category_id = null)
  // Using update API with random ID to create new category
  const categoryA = await api.functional.ecommerceMall.admin.categories.update(
    adminConnection,
    {
      categoryId: typia.random<string & tags.Format<"uuid">>(),
      body: {
        name: typia.random<string & tags.MinLength<1> & tags.MaxLength<500>>(),
      } satisfies IEcommerceMallCategory.IUpdate,
    },
  );
  typia.assert(categoryA);
  // 3. Create subcategory B with parent_category_id = A.id
  const categoryB = await api.functional.ecommerceMall.admin.categories.update(
    adminConnection,
    {
      categoryId: typia.random<string & tags.Format<"uuid">>(),
      body: {
        name: typia.random<string & tags.MinLength<1> & tags.MaxLength<500>>(),
        parent_category_id: categoryA.id,
      } satisfies IEcommerceMallCategory.IUpdate,
    },
  );
  typia.assert(categoryB);
  // 4. Create subcategory C with parent_category_id = A.id
  const categoryC = await api.functional.ecommerceMall.admin.categories.update(
    adminConnection,
    {
      categoryId: typia.random<string & tags.Format<"uuid">>(),
      body: {
        name: typia.random<string & tags.MinLength<1> & tags.MaxLength<500>>(),
        parent_category_id: categoryA.id,
      } satisfies IEcommerceMallCategory.IUpdate,
    },
  );
  typia.assert(categoryC);
  // 5. Attempt to update category B to have parent_category_id = C.id
  // This should fail because C is a subcategory (cannot be parent of another subcategory)
  await TestValidator.error(
    "subcategory cannot become child of another subcategory",
    async () => {
      await api.functional.ecommerceMall.admin.categories.update(
        adminConnection,
        {
          categoryId: categoryB.id,
          body: {
            parent_category_id: categoryC.id,
          } satisfies IEcommerceMallCategory.IUpdate,
        },
      );
    },
  );
  // 6. Verify category B's parent remains unchanged (still A.id)
  const updatedCategoryB =
    await api.functional.ecommerceMall.admin.categories.update(
      adminConnection,
      {
        categoryId: categoryB.id,
        body: {
          name: categoryB.name,
        } satisfies IEcommerceMallCategory.IUpdate,
      },
    );
  typia.assert(updatedCategoryB);
  TestValidator.equals(
    "parent remains unchanged after failed update attempt",
    updatedCategoryB.parent?.id,
    categoryA.id,
  );
}
