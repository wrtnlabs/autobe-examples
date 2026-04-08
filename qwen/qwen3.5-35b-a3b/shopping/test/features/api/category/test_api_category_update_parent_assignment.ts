import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
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

export async function test_api_category_update_parent_assignment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register administrator
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
  // 2. Create top-level category (Parent Category)
  const topLevelCategory1 =
    await generate_random_ecommerce_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: "Parent Category",
          description: "This is a parent category for testing",
          sort_order: 10,
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(topLevelCategory1);
  // Verify it's a top-level category
  typia.assert(topLevelCategory1.parent_id === null);
  typia.assert(topLevelCategory1.parent === null);
  // 3. Create child category with parent_id pointing to the top-level category
  const childCategory =
    await generate_random_ecommerce_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: "Child Category",
          description: "This is a child category",
          parent_id: topLevelCategory1.id,
          sort_order: 20,
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(childCategory);
  // Verify child category has the correct parent
  TestValidator.equals(
    "child has correct parent_id",
    childCategory.parent_id,
    topLevelCategory1.id,
  );
  TestValidator.equals(
    "child parent summary matches",
    childCategory.parent?.id,
    topLevelCategory1.id,
  );
  TestValidator.equals(
    "child parent name matches",
    childCategory.parent?.name,
    topLevelCategory1.name,
  );
  // 4. Create another top-level category (Sibling Category) to reassign as parent
  const topLevelCategory2 =
    await generate_random_ecommerce_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: "Sibling Category",
          description: "This is another parent category",
          sort_order: 30,
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(topLevelCategory2);
  typia.assert(topLevelCategory2.parent_id === null);
  typia.assert(topLevelCategory2.parent === null);
  // 5. Update the child category's parent_id to the new top-level category
  const oldParent = topLevelCategory1.id;
  const newParent = topLevelCategory2.id;
  const oldUpdatedAt = childCategory.updated_at;
  const updatedCategory =
    await api.functional.ecommerceMall.administrator.categories.putByCategoryid(
      adminConnection,
      {
        categoryId: childCategory.id,
        body: {
          parent_id: newParent,
        } satisfies IEcommerceMallCategory.IUpdate,
      },
    );
  typia.assert(updatedCategory);
  // 6. Verify the updated child category now shows the new parent
  TestValidator.equals(
    "updated parent_id matches new top-level category",
    updatedCategory.parent_id,
    newParent,
  );
  TestValidator.equals(
    "updated parent summary matches new top-level category",
    updatedCategory.parent?.id,
    newParent,
  );
  TestValidator.equals(
    "updated parent name matches new top-level category",
    updatedCategory.parent?.name,
    topLevelCategory2.name,
  );
  // 7. Verify updated_at timestamp is refreshed
  TestValidator.notEquals(
    "updated_at timestamp is refreshed",
    oldUpdatedAt,
    updatedCategory.updated_at,
  );
  // 8. Verify the old parent is no longer referenced by the updated child
  TestValidator.equals(
    "child no longer references old parent",
    updatedCategory.parent_id,
    topLevelCategory1.id,
  );
}
