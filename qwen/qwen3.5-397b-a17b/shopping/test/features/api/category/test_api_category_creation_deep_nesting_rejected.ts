import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
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

/**
 * Test business rule enforcement preventing deep nesting beyond one level for shopping mall categories.
 *
 * Validates the complete category hierarchy constraint by creating a top-level category, then a subcategory under it, and finally attempting to create a third category with the subcategory as parent. The system must reject this deep nesting attempt as categories support only one level of nesting.
 *
 * Special attention is given to verifying that the hierarchical structure constraint is properly enforced at the business logic level, ensuring subcategories cannot have children while top-level categories can.
 *
 * 1. Administrator authenticates to gain category management permissions.
 * 2. Creates a top-level category with randomized name and description.
 * 3. Creates a subcategory under the top-level category using its ID as parentId.
 * 4. Attempts to create another category with the subcategory as parent (deep nesting).
 * 5. Validates that the operation fails with appropriate business logic error.
 */
export async function test_api_category_creation_deep_nesting_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular" as const,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Create top-level category
  const topLevelCategory =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          parentId: null,
        },
      },
    );
  typia.assert(topLevelCategory);
  // 3. Create subcategory under top-level category
  const subcategory =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          parentId: topLevelCategory.id,
        },
      },
    );
  typia.assert(subcategory);
  // 4. Attempt to create category under subcategory (deep nesting - should fail)
  await TestValidator.error("deep nesting rejected", async () => {
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          parentId: subcategory.id,
        },
      },
    );
  });
}
