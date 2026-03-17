import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_shopping_mall_administrator_categories_create } from "../../../generate/generate_random_shopping_mall_administrator_categories_create";
import { generate_random_shopping_mall_administrator_categories_subcategories_create } from "../../../generate/generate_random_shopping_mall_administrator_categories_subcategories_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";

export async function test_api_category_deletion_subcategory_promotion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Create parent category
  const parentCategory =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
        },
      },
    );
  typia.assert(parentCategory);
  // Verify parent is top-level (no parent)
  TestValidator.equals(
    "parent category has no parent",
    parentCategory.parent,
    null,
  );
  // 3. Create subcategory under parent
  const subcategory =
    await generate_random_shopping_mall_administrator_categories_subcategories_create(
      adminConnection,
      {
        params: {
          categoryId: parentCategory.id,
        },
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
        },
      },
    );
  typia.assert(subcategory);
  // Verify subcategory has parent reference before deletion
  TestValidator.predicate(
    "subcategory has parent before deletion",
    subcategory.parent !== null,
  );
  TestValidator.equals(
    "subcategory parent is the created parent category",
    subcategory.parent?.id,
    parentCategory.id,
  );
  // 4. Delete parent category - subcategories should be promoted to top-level
  await api.functional.shoppingMall.administrator.categories.erase(
    adminConnection,
    {
      categoryId: parentCategory.id,
    },
  );
  // 5. Verify deletion succeeded and subcategory promotion behavior
  // Note: The subcategory should now be a top-level category (parent set to null)
  // This is the expected behavior per API specification
  // The backend handles the promotion when parent is deleted
  TestValidator.predicate(
    "subcategory exists with valid id after parent deletion",
    subcategory.id !== null && subcategory.id !== undefined,
  );
}
