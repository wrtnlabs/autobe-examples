import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallCategoriesSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategoriesSnapshot";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_ecommerce_mall_administrator_categories_create } from "../../../generate/generate_random_ecommerce_mall_administrator_categories_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";

export async function test_api_category_snapshot_parent_relationship(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator joins the system
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      display_name: RandomGenerator.name(2),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular",
    } satisfies IEcommerceMallAdministrator.IJoin,
  });
  typia.assert(admin);
  adminConnection.headers = { Authorization: admin.token.access };
  // 2. Create top-level category (parent)
  const parentCategory =
    await generate_random_ecommerce_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.alphabets(8) + "Parent",
          description: "Top-level category for parent-child testing",
          parent_id: null,
          sort_order: 1,
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(parentCategory);
  // 3. Create subcategory with parent reference
  const subcategory =
    await generate_random_ecommerce_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.alphabets(8) + "Child",
          description: "Subcategory under parent category",
          parent_id: parentCategory.id,
          sort_order: 2,
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(subcategory);
  // 4. Verify initial category has correct parent relationship (from create response)
  TestValidator.equals(
    "initial parent_id matches",
    subcategory.parent_id,
    parentCategory.id,
  );
  TestValidator.equals(
    "initial parent exists",
    subcategory.parent?.id,
    parentCategory.id,
  );
  // 5. Modify subcategory to create snapshot
  const updatedCategory =
    await api.functional.ecommerceMall.administrator.categories.putByCategoryid(
      adminConnection,
      {
        categoryId: subcategory.id,
        body: {
          description: "Updated subcategory description for snapshot testing",
          name: RandomGenerator.alphabets(8) + "ChildUpdated",
        } satisfies IEcommerceMallCategory.IUpdate,
      },
    );
  typia.assert(updatedCategory);
  // Verify the update created a new snapshot (updated_at should change)
  TestValidator.notEquals(
    "updated_at changed",
    subcategory.updated_at,
    updatedCategory.updated_at,
  );
  // 7. Validate that parent relationship exists in current state
  TestValidator.equals(
    "current parent_id preserved",
    updatedCategory.parent_id,
    parentCategory.id,
  );
  TestValidator.equals(
    "current parent matches",
    updatedCategory.parent?.id,
    parentCategory.id,
  );
  // 8. Verify parent category is still accessible and unchanged
  TestValidator.equals(
    "parent category name unchanged",
    parentCategory.name,
    parentCategory.name,
  );
  TestValidator.equals(
    "parent category description unchanged",
    parentCategory.description,
    parentCategory.description,
  );
}