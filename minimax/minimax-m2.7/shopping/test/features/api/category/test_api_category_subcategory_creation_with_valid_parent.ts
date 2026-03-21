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

export async function test_api_category_subcategory_creation_with_valid_parent(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create a top-level parent category
  const parentCategory =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(parentCategory);
  // 3. Create a subcategory under the parent
  const subcategoryName = RandomGenerator.paragraph({ sentences: 1 });
  const subcategoryDescription = RandomGenerator.paragraph({ sentences: 2 });
  const subcategory =
    await generate_random_ecommerce_mall_admin_admin_categories_subcategories_create(
      adminConnection,
      {
        params: {
          categoryId: parentCategory.id,
        },
        body: {
          name: subcategoryName,
          description: subcategoryDescription,
        },
      },
    );
  typia.assert(subcategory);
  // 4. Validate response structure
  TestValidator.equals("subcategory id is uuid", subcategory.id.length, 36);
  TestValidator.equals(
    "subcategory name matches request",
    subcategory.name,
    subcategoryName,
  );
  TestValidator.equals(
    "subcategory description matches request",
    subcategory.description,
    subcategoryDescription,
  );
  // 5. Verify the created subcategory has correct parent_id pointing to the parent category
  TestValidator.equals(
    "parent_id points to parent category",
    subcategory.parent?.id,
    parentCategory.id,
  );
  TestValidator.equals(
    "parent name matches",
    subcategory.parent?.name,
    parentCategory.name,
  );
  // 6. Verify timestamps are set correctly
  TestValidator.predicate(
    "created_at is set",
    subcategory.created_at !== null && subcategory.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at is set",
    subcategory.updated_at !== null && subcategory.updated_at !== undefined,
  );
  // 7. Verify subcategory has no children initially
  TestValidator.equals(
    "subcategory has no children",
    subcategory.subcategories.length,
    0,
  );
}
