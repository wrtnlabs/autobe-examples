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

export async function test_api_category_subcategory_creation_and_hierarchy_enforcement(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Register and authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create top-level parent category "Sports"
  const sportsCategory =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: "Sports",
          description: "Sports and outdoor activities",
          parent_id: null,
        },
      },
    );
  typia.assert(sportsCategory);
  // 3. Create subcategory "Running" under "Sports"
  const runningCategory =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: "Running",
          description: "Running shoes and gear",
          parent_id: sportsCategory.id,
        },
      },
    );
  typia.assert(runningCategory);
  // 4. Validate the returned subcategory structure
  TestValidator.equals(
    "subcategory parent_id matches Sports id",
    runningCategory.parent_id,
    sportsCategory.id,
  );
  TestValidator.predicate(
    "subcategory has non-null parent",
    runningCategory.parent !== null,
  );
  TestValidator.equals(
    "subcategory parent id in summary matches Sports id",
    runningCategory.parent!.id,
    sportsCategory.id,
  );
  TestValidator.equals(
    "subcategory has empty children array",
    runningCategory.children.length,
    0,
  );
  TestValidator.equals(
    "subcategory name is Running",
    runningCategory.name,
    "Running",
  );
  TestValidator.equals(
    "subcategory description is correct",
    runningCategory.description,
    "Running shoes and gear",
  );
  // 5. Hierarchy Enforcement: Attempt to create a third-level category (Running as parent) — should fail
  await TestValidator.error(
    "subcategory cannot be used as parent (hierarchy enforcement)",
    async () => {
      await generate_random_shopping_mall_admin_categories_create(
        adminConnection,
        {
          body: {
            name: "Trail Running",
            description: "Trail running equipment",
            parent_id: runningCategory.id,
          },
        },
      );
    },
  );
  // 6. Uniqueness Enforcement: Attempt to create duplicate subcategory name "Running" under "Sports" — should fail
  await TestValidator.error(
    "duplicate subcategory name rejected (409 Conflict)",
    async () => {
      await generate_random_shopping_mall_admin_categories_create(
        adminConnection,
        {
          body: {
            name: "Running",
            description: "Another running category",
            parent_id: sportsCategory.id,
          },
        },
      );
    },
  );
}
