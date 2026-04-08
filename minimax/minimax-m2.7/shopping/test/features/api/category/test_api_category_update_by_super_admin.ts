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

export async function test_api_category_update_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register super admin account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_admin_join(superAdminConnection, {});
  typia.assert(authorized);
  // 2. Create a parent category with initial name and description
  const category =
    await generate_random_ecommerce_mall_super_admin_categories_create(
      superAdminConnection,
      {
        body: {
          name: "Electronics",
          description: "Electronic devices and accessories",
        },
      },
    );
  typia.assert(category);
  // 3. Store original timestamps for verification
  const originalCreatedAt = category.created_at;
  const originalUpdatedAt = category.updated_at;
  // 4. Update the category via PUT with new name and description
  const updatedCategory =
    await api.functional.ecommerceMall.superAdmin.categories.update(
      superAdminConnection,
      {
        categoryId: category.id,
        body: {
          name: "Consumer Electronics",
          description: "All consumer electronic products",
        },
      },
    );
  typia.assert(updatedCategory);
  // 5. Validate updated fields
  TestValidator.equals(
    "category name updated",
    updatedCategory.name,
    "Consumer Electronics",
  );
  TestValidator.equals(
    "category description updated",
    updatedCategory.description,
    "All consumer electronic products",
  );
  // 6. Verify updated_at timestamp changed
  TestValidator.predicate(
    "updated_at timestamp changed",
    updatedCategory.updated_at !== originalUpdatedAt,
  );
  // 7. Verify original fields preserved
  TestValidator.equals("id preserved", updatedCategory.id, category.id);
  TestValidator.equals(
    "created_at preserved",
    updatedCategory.created_at,
    originalCreatedAt,
  );
  TestValidator.equals(
    "parent preserved",
    updatedCategory.parent,
    category.parent,
  );
  TestValidator.equals(
    "subcategories preserved",
    updatedCategory.subcategories,
    category.subcategories,
  );
  TestValidator.equals(
    "products_count preserved",
    updatedCategory.products_count,
    category.products_count,
  );
  TestValidator.equals(
    "deleted_at preserved",
    updatedCategory.deleted_at,
    category.deleted_at,
  );
}
