import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
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

export async function test_api_category_customer_retrieve_top_level(
  connection: api.IConnection,
) {
  // 1. Create admin connection to set up the test category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"url">>(),
      referrer: typia.random<string & tags.Format<"url">>(),
    },
  });
  // 2. Create a top-level category (no parentId)
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        parentId: null,
      } satisfies IEcommerceMallCategory.ICreate,
    },
  );
  typia.assert(category);
  // 3. Customer retrieves the category by ID (no auth required for browsing)
  const customerConnection: api.IConnection = { host: connection.host };
  const retrieved = await api.functional.ecommerceMall.categories.at(
    customerConnection,
    {
      categoryId: category.id,
    },
  );
  typia.assert(retrieved);
  // 4. Validate the retrieved category details
  TestValidator.equals("category id matches", retrieved.id, category.id);
  TestValidator.equals("category name matches", retrieved.name, category.name);
  TestValidator.equals(
    "category description matches",
    retrieved.description,
    category.description,
  );
  TestValidator.equals("parent is null for top-level", retrieved.parent, null);
  TestValidator.predicate(
    "subcategories is array",
    Array.isArray(retrieved.subcategories),
  );
  TestValidator.predicate("created_at is valid", !!retrieved.created_at);
  TestValidator.predicate("updated_at is valid", !!retrieved.updated_at);
}
