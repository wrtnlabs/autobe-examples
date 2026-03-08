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
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";

/**
 * Test administrator category creation with description.
 * Validates that admin can create a category with both name and description fields,
 * and the system properly stores and returns the description in the response.
 */
export async function test_api_category_create_with_description(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth: IEcommerceMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: typia.random<IEcommerceMallAdmin.IJoin>(),
    },
  );
  typia.assert(adminAuth);
  // 2. Create category with name and description
  const categoryName: string = RandomGenerator.name(2);
  const description: string = RandomGenerator.paragraph({ sentences: 3 });
  const category: IEcommerceMallCategory =
    await generate_random_ecommerce_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: categoryName,
          description: description,
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(category);
  // 3. Validate category includes description
  TestValidator.equals("category name matches", category.name, categoryName);
  TestValidator.equals(
    "category description matches",
    category.description,
    description,
  );
  TestValidator.predicate("category has valid ID", category.id.length > 0);
  TestValidator.predicate(
    "category has created_at",
    category.created_at.length > 0,
  );
  TestValidator.predicate(
    "category has updated_at",
    category.updated_at.length > 0,
  );
  TestValidator.predicate(
    "category is top-level (no parent)",
    category.parent_id === null,
  );
  TestValidator.predicate("category parent is null", category.parent === null);
}