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

export async function test_api_category_subcategory_nesting_limit_enforcement(
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
          name: RandomGenerator.paragraph({ sentences: 1 }),
        },
      },
    );
  typia.assert(parentCategory);
  // 3. Create a first-level subcategory under the parent
  const firstLevelSubcategory =
    await generate_random_ecommerce_mall_admin_admin_categories_subcategories_create(
      adminConnection,
      {
        params: {
          categoryId: parentCategory.id,
        },
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
        },
      },
    );
  typia.assert(firstLevelSubcategory);
  // 4. Attempt to create a subcategory under the first-level subcategory (should fail)
  // The system enforces single-level nesting, so this should return an error
  await TestValidator.error("nesting limit enforced", async () => {
    await generate_random_ecommerce_mall_admin_admin_categories_subcategories_create(
      adminConnection,
      {
        params: {
          categoryId: firstLevelSubcategory.id,
        },
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
        },
      },
    );
  });
}
