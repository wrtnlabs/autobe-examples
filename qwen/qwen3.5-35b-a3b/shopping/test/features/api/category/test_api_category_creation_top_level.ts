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

export async function test_api_category_creation_top_level(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(admin);
  // 2. Create admin connection with token for API calls
  const adminAuthenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: admin.token.access },
  };
  // 3. Create top-level category (no parent - undefined/null)
  const categoryName = RandomGenerator.name();
  const categoryDescription = RandomGenerator.paragraph({ sentences: 2 });
  const category = await api.functional.ecommerceMall.admin.categories.create(
    adminAuthenticatedConnection,
    {
      body: {
        name: categoryName,
        description: categoryDescription,
      } satisfies IEcommerceMallCategory.ICreate,
    },
  );
  typia.assert(category);
  // 4. Validate category name matches input
  TestValidator.equals(
    "category name matches input",
    category.name,
    categoryName,
  );
  // 5. Validate category description matches input
  TestValidator.equals(
    "category description matches input",
    category.description,
    categoryDescription,
  );
  // 6. Validate is_leaf is false (parent category, even with no children)
  TestValidator.equals(
    "is_leaf is false for parent category",
    category.is_leaf,
    false,
  );
  // 7. Validate parent is null for top-level category
  TestValidator.equals(
    "parent is null for top-level category",
    category.parent,
    null,
  );
  // 8. Validate product count is 0 (newly created category)
  TestValidator.equals(
    "product count is 0 for new category",
    category.product_count,
    0,
  );
  // 9. Validate subcategory count is 0 (no children yet)
  TestValidator.equals("subcategory count is 0", category.subcategory_count, 0);
  // 10. Validate created_at timestamp is valid ISO 8601 date
  TestValidator.predicate("created_at is valid ISO 8601 date", () => {
    const date = new Date(category.created_at);
    return !isNaN(date.getTime());
  });
  // 11. Validate updated_at timestamp is valid ISO 8601 date
  TestValidator.predicate("updated_at is valid ISO 8601 date", () => {
    const date = new Date(category.updated_at);
    return !isNaN(date.getTime());
  });
  // 12. Validate ID is a valid UUID format
  TestValidator.predicate("ID is valid UUID format", () => {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(category.id);
  });
}
