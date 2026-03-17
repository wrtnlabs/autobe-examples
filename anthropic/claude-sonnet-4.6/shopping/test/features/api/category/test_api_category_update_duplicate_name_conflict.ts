import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfCustomer";
import type { IShoppingMallAdminOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfSeller";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";

export async function test_api_category_update_duplicate_name_conflict(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    },
  });
  // 2. Create first top-level category 'Sports'
  const sportsCategory =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          parent_id: null,
          name: "Sports",
          description: "Sports category",
        },
      },
    );
  typia.assert(sportsCategory);
  // 3. Create second top-level category 'Outdoor'
  const outdoorCategory =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          parent_id: null,
          name: "Outdoor",
          description: "Outdoor category",
        },
      },
    );
  typia.assert(outdoorCategory);
  // 4. Attempt to rename 'Outdoor' to 'Sports' - should fail with conflict
  await TestValidator.error(
    "duplicate top-level category name should conflict",
    async () => {
      await api.functional.shoppingMall.admin.categories.update(
        adminConnection,
        {
          categoryId: outdoorCategory.id,
          body: {
            name: "Sports",
            description: "Updated description",
          } satisfies IShoppingMallCategory.IUpdate,
        },
      );
    },
  );
  // 5. Setup for subcategory sibling conflict test
  // Create parent category 'Footwear'
  const footwearCategory =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          parent_id: null,
          name: "Footwear",
          description: "Footwear category",
        },
      },
    );
  typia.assert(footwearCategory);
  // 6. Create subcategory 'Running Shoes' under 'Footwear'
  const runningShoes =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          parent_id: footwearCategory.id,
          name: "Running Shoes",
          description: "Running shoes subcategory",
        },
      },
    );
  typia.assert(runningShoes);
  // 7. Create subcategory 'Casual Shoes' under 'Footwear'
  const casualShoes =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          parent_id: footwearCategory.id,
          name: "Casual Shoes",
          description: "Casual shoes subcategory",
        },
      },
    );
  typia.assert(casualShoes);
  // 8. Attempt to rename 'Casual Shoes' to 'Running Shoes' - should fail (sibling conflict)
  await TestValidator.error(
    "duplicate sibling subcategory name should conflict",
    async () => {
      await api.functional.shoppingMall.admin.categories.update(
        adminConnection,
        {
          categoryId: casualShoes.id,
          body: {
            name: "Running Shoes",
            description: "Updated casual shoes",
          } satisfies IShoppingMallCategory.IUpdate,
        },
      );
    },
  );
  // 9. Cross-level: rename 'Casual Shoes' subcategory to 'Sports'
  // 'Sports' is a top-level category name, but it should be allowed as a subcategory name
  // since uniqueness is enforced only at the same hierarchy level within same parent
  const crossLevelUpdate =
    await api.functional.shoppingMall.admin.categories.update(adminConnection, {
      categoryId: casualShoes.id,
      body: {
        name: "Sports",
        description: "Cross-level rename allowed",
      } satisfies IShoppingMallCategory.IUpdate,
    });
  typia.assert(crossLevelUpdate);
  TestValidator.equals(
    "cross-level rename succeeds with correct name",
    crossLevelUpdate.name,
    "Sports",
  );
  TestValidator.equals(
    "cross-level renamed category has correct parent",
    crossLevelUpdate.parent_id,
    footwearCategory.id,
  );
}
