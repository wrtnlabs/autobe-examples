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

export async function test_api_category_creation_top_level(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminAuth = await authorize_super_admin_join(connection, {});
  const superAdminConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${superAdminAuth.token.access}`,
    },
  };
  // 2. Generate random category name and description for top-level category
  const categoryName = RandomGenerator.paragraph({ sentences: 1 });
  const categoryDescription = RandomGenerator.paragraph({ sentences: 2 });
  // 3. Create a top-level category (no parent_id)
  const category =
    await generate_random_ecommerce_mall_super_admin_categories_create(
      superAdminConnection,
      {
        body: {
          name: categoryName,
          description: categoryDescription,
          // parent_id is undefined to create top-level category
        },
      },
    );
  // 4. Validate the response using typia.assert
  typia.assert(category);
  // 5. Validate business logic
  TestValidator.equals(
    "category name matches input",
    category.name,
    categoryName,
  );
  TestValidator.equals(
    "category description matches input",
    category.description,
    categoryDescription,
  );
  TestValidator.predicate(
    "category has null parent (top-level)",
    category.parent === null,
  );
  TestValidator.predicate(
    "category has empty subcategories",
    category.subcategories.length === 0,
  );
  TestValidator.predicate(
    "category has valid UUID id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      category.id,
    ),
  );
  TestValidator.predicate(
    "products_count is zero for new category",
    category.products_count === 0,
  );
  TestValidator.predicate(
    "deleted_at is null for active category",
    category.deleted_at === null,
  );
}
