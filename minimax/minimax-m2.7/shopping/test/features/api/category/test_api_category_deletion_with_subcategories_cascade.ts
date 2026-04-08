import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_ecommerce_mall_super_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_super_admin_categories_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";

export async function test_api_category_deletion_with_subcategories_cascade(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Create parent category
  const parentCategory =
    await generate_random_ecommerce_mall_super_admin_categories_create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(parentCategory);
  TestValidator.equals(
    "parent category has no parent",
    parentCategory.parent,
    null,
  );
  // 3. Create multiple subcategories under the parent
  const subcategory1 =
    await generate_random_ecommerce_mall_super_admin_categories_create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          parent_id: parentCategory.id,
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(subcategory1);
  TestValidator.equals(
    "subcategory1 parent matches",
    subcategory1.parent?.id,
    parentCategory.id,
  );
  const subcategory2 =
    await generate_random_ecommerce_mall_super_admin_categories_create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          parent_id: parentCategory.id,
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(subcategory2);
  TestValidator.equals(
    "subcategory2 parent matches",
    subcategory2.parent?.id,
    parentCategory.id,
  );
  // 4. Delete the parent category (should cascade delete all subcategories)
  await api.functional.ecommerceMall.superAdmin.categories.erase(
    superAdminConnection,
    {
      categoryId: parentCategory.id,
    },
  );
  // 5. Verify cascade deletion - re-deleting parent should return 404
  await TestValidator.httpError("parent category already deleted", 404, () =>
    api.functional.ecommerceMall.superAdmin.categories.erase(
      superAdminConnection,
      {
        categoryId: parentCategory.id,
      },
    ),
  );
  // 6. Verify cascade deletion - re-deleting subcategories should also return 404
  await TestValidator.httpError(
    "subcategory1 already deleted (cascade)",
    404,
    () =>
      api.functional.ecommerceMall.superAdmin.categories.erase(
        superAdminConnection,
        {
          categoryId: subcategory1.id,
        },
      ),
  );
  await TestValidator.httpError(
    "subcategory2 already deleted (cascade)",
    404,
    () =>
      api.functional.ecommerceMall.superAdmin.categories.erase(
        superAdminConnection,
        {
          categoryId: subcategory2.id,
        },
      ),
  );
}
