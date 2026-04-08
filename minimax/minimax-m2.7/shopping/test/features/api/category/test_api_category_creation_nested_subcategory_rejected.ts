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

export async function test_api_category_creation_nested_subcategory_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_admin_join(superAdminConnection, {});
  typia.assert(authorized);
  // 2. Create a parent category (top-level category)
  const parentCategory =
    await generate_random_ecommerce_mall_super_admin_categories_create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(parentCategory);
  TestValidator.equals(
    "parent category has no parent",
    parentCategory.parent,
    null,
  );
  TestValidator.equals(
    "parent category has empty subcategories",
    parentCategory.subcategories.length,
    0,
  );
  // 3. Create a subcategory under the parent (first level of nesting)
  const subcategory =
    await generate_random_ecommerce_mall_super_admin_categories_create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          parent_id: parentCategory.id,
        },
      },
    );
  typia.assert(subcategory);
  TestValidator.equals(
    "subcategory has parent_id",
    subcategory.parent?.id,
    parentCategory.id,
  );
  TestValidator.equals(
    "subcategory has empty subcategories",
    subcategory.subcategories.length,
    0,
  );
  // 4. Attempt to create a sub-subcategory (should be rejected)
  // The system must reject this request because the parent category is itself a subcategory
  await TestValidator.error(
    "nested subcategory creation must be rejected",
    async () => {
      await generate_random_ecommerce_mall_super_admin_categories_create(
        superAdminConnection,
        {
          body: {
            name: RandomGenerator.paragraph({ sentences: 1 }),
            description: RandomGenerator.paragraph({ sentences: 2 }),
            parent_id: subcategory.id, // Trying to use a subcategory as parent
          },
        },
      );
    },
  );
}
