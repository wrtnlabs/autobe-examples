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
import { generate_random_ecommerce_mall_admin_admin_categories_subcategories_create } from "../../../generate/generate_random_ecommerce_mall_admin_admin_categories_subcategories_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";

export async function test_api_category_update_name_conflict_with_sibling(
  connection: api.IConnection,
): Promise<void> {
  // Test that updating a category name to match an existing sibling category name
  // under the same parent fails with a 409 conflict error.
  // 1. Authenticate as administrator
  // 2. Create a parent category
  // 3. Create two subcategories under it with different names
  // 4. Attempt to update the first subcategory's name to match the second subcategory's name
  // 5. Verify the system rejects this with a 409 conflict error
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // Create parent category
  const parentCategory =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {
        body: {
          name: `Parent Category ${RandomGenerator.alphabets(8)}`,
        },
      },
    );
  typia.assert(parentCategory);
  // Create first subcategory with unique name
  const firstSubcategoryName = `First Subcategory ${RandomGenerator.alphabets(6)}`;
  const firstSubcategory =
    await generate_random_ecommerce_mall_admin_admin_categories_subcategories_create(
      adminConnection,
      {
        params: { categoryId: parentCategory.id },
        body: { name: firstSubcategoryName },
      },
    );
  typia.assert(firstSubcategory);
  // Create second subcategory with different unique name
  const secondSubcategoryName = `Second Subcategory ${RandomGenerator.alphabets(6)}`;
  const secondSubcategory =
    await generate_random_ecommerce_mall_admin_admin_categories_subcategories_create(
      adminConnection,
      {
        params: { categoryId: parentCategory.id },
        body: { name: secondSubcategoryName },
      },
    );
  typia.assert(secondSubcategory);
  // Attempt to update first subcategory's name to match second subcategory's name
  // This should fail with 409 Conflict
  await TestValidator.httpError(
    "updating category name to sibling name should return 409 conflict",
    409,
    async () =>
      await api.functional.ecommerceMall.admin.categories.update(
        adminConnection,
        {
          categoryId: firstSubcategory.id,
          body: {
            name: secondSubcategoryName,
          } satisfies IEcommerceMallCategory.IUpdate,
        },
      ),
  );
}
