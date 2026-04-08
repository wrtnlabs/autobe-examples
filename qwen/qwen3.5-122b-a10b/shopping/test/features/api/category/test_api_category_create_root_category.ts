import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_ecommerce_admin_categories_create } from "../../../generate/generate_random_ecommerce_admin_categories_create";
import { prepare_random_ecommerce_category } from "../../../prepare/prepare_random_ecommerce_category";

export async function test_api_category_create_root_category(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      reason: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  // 2. Create root category (parent_id = null)
  const categoryName = RandomGenerator.name(2);
  const categoryDescription = RandomGenerator.paragraph({ sentences: 3 });
  const category: IEcommerceCategory =
    await generate_random_ecommerce_admin_categories_create(adminConnection, {
      body: {
        name: categoryName,
        description: categoryDescription,
        parent_id: null,
      } satisfies IEcommerceCategory.ICreate,
    });
  typia.assert(category);
  // 3. Validate root category properties
  TestValidator.equals("category name matches", category.name, categoryName);
  TestValidator.equals(
    "category description matches",
    category.description,
    categoryDescription,
  );
  TestValidator.predicate(
    "parent is null for root category",
    category.parent === null,
  );
  TestValidator.predicate(
    "has valid UUID",
    /^[0-9a-f-]{36}$/i.test(category.id),
  );
  TestValidator.predicate(
    "created_at is valid datetime",
    !isNaN(Date.parse(category.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid datetime",
    !isNaN(Date.parse(category.updated_at)),
  );
  TestValidator.predicate(
    "subcategories is empty array",
    Array.isArray(category.subcategories) &&
      category.subcategories.length === 0,
  );
}
