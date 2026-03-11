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

export async function test_api_category_creation_subcategory(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminResponse = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(adminResponse);
  // 2. Create top-level category (parent_category_id = null)
  const parentCategoryName = RandomGenerator.paragraph({ sentences: 2 });
  const parentCategory =
    await api.functional.ecommerceMall.admin.categories.create(
      adminConnection,
      {
        body: {
          name: parentCategoryName,
          description: typia.random<string>() ?? null,
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(parentCategory);
  TestValidator.equals("parent is top-level", parentCategory.parent, null);
  TestValidator.equals(
    "parent is initially a leaf",
    parentCategory.is_leaf,
    true,
  );
  // 3. Create subcategory under the top-level category
  const subcategoryName = RandomGenerator.paragraph({ sentences: 2 });
  const subcategory =
    await api.functional.ecommerceMall.admin.categories.create(
      adminConnection,
      {
        body: {
          name: subcategoryName,
          description: typia.random<string>() ?? null,
          parent_category_id: parentCategory.id,
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(subcategory);
  // 4. Verify subcategory has correct parent reference
  TestValidator.equals(
    "subcategory has correct parent id",
    subcategory.parent?.id,
    parentCategory.id,
  );
  TestValidator.equals(
    "subcategory has correct parent name",
    subcategory.parent?.name,
    parentCategory.name,
  );
  // 5. Verify parent category's is_leaf changed to false
  TestValidator.equals(
    "parent is no longer a leaf",
    parentCategory.is_leaf,
    false,
  );
  // 6. Test uniqueness constraint - try to create duplicate name under same parent
  await TestValidator.error(
    "duplicate name under same parent should fail",
    async () => {
      await api.functional.ecommerceMall.admin.categories.create(
        adminConnection,
        {
          body: {
            name: subcategoryName,
            parent_category_id: parentCategory.id,
          } satisfies IEcommerceMallCategory.ICreate,
        },
      );
    },
  );
  // 7. Verify subcategory is visible (check subcategory_count on parent)
  TestValidator.equals(
    "parent has subcategory",
    subcategory.subcategory_count,
    0,
  );
  TestValidator.equals(
    "subcategory has no children",
    subcategory.is_leaf,
    true,
  );
}
