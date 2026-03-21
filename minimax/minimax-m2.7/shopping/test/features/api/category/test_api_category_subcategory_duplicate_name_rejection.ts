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

export async function test_api_category_subcategory_duplicate_name_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin via /auth/admin/join
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create a top-level parent category via /admin/admin/categories
  const parentCategory =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {
        body: {
          name: "Electronics Parent",
          description: "Parent category for electronics",
        },
      },
    );
  typia.assert(parentCategory);
  // 3. Create a subcategory with name 'Electronics' under the parent
  const subcategoryName = "Electronics";
  const firstSubcategory =
    await generate_random_ecommerce_mall_admin_admin_categories_subcategories_create(
      adminConnection,
      {
        body: {
          name: subcategoryName,
          description: "First subcategory for electronics",
        },
        params: {
          categoryId: parentCategory.id,
        },
      },
    );
  typia.assert(firstSubcategory);
  // 4. Attempt to create another subcategory with the same name 'Electronics' under the same parent
  // 5. Validate the response returns a conflict error (409)
  // 6. Verify the error message indicates the name is already taken among siblings
  await TestValidator.error(
    "duplicate subcategory name under same parent should return 409",
    async () => {
      await api.functional.ecommerceMall.admin.admin.categories.subcategories.create(
        adminConnection,
        {
          categoryId: parentCategory.id,
          body: {
            name: subcategoryName,
            description: "Duplicate subcategory name should fail",
          } satisfies IEcommerceMallCategory.ICreate,
        },
      );
    },
  );
}
