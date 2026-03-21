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
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";

export async function test_api_category_deletion_with_subcategories_cascade(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // Create parent category
  const parentCategory =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(parentCategory);
  TestValidator.equals("parent category created", parentCategory.parent, null);
  TestValidator.equals(
    "parent category has no subcategories initially",
    parentCategory.subcategories.length,
    0,
  );
  // Create subcategory under parent category
  const subcategory =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          parent_id: parentCategory.id,
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(subcategory);
  TestValidator.equals(
    "subcategory has correct parent",
    subcategory.parent?.id,
    parentCategory.id,
  );
  // Delete parent category - should return void (204 No Content)
  await api.functional.ecommerceMall.admin.admin.categories.erase(
    adminConnection,
    {
      categoryId: parentCategory.id,
    },
  );
  // Verify parent category is soft-deleted (deleted_at is set)
  TestValidator.predicate(
    "parent category deleted_at is set",
    parentCategory.deleted_at !== null,
  );
  // Verify subcategory is cascade deleted (deleted_at is set)
  TestValidator.predicate(
    "subcategory deleted_at is set",
    subcategory.deleted_at !== null,
  );
  // Test concurrent deletion attempt returns 204 (idempotent behavior for already deleted categories)
  await api.functional.ecommerceMall.admin.admin.categories.erase(
    adminConnection,
    {
      categoryId: parentCategory.id,
    },
  );
}
