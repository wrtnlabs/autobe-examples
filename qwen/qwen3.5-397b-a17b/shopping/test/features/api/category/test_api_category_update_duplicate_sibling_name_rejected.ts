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
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";

export async function test_api_category_update_duplicate_sibling_name_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create parent category
  const parentCategory =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          parent_id: null,
        },
      },
    );
  typia.assert(parentCategory);
  // 3. Create first subcategory under parent
  const subcategoryA =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          parent_id: parentCategory.id,
        },
      },
    );
  typia.assert(subcategoryA);
  // 4. Create second subcategory under same parent with different name
  const subcategoryB =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          parent_id: parentCategory.id,
        },
      },
    );
  typia.assert(subcategoryB);
  // 5. Verify subcategories have different names
  TestValidator.notEquals(
    "subcategories have different initial names",
    subcategoryA.name,
    subcategoryB.name,
  );
  // 6. Attempt to update subcategoryA's name to match subcategoryB's name
  // This should be rejected due to duplicate sibling name validation
  await TestValidator.error("duplicate sibling name rejected", async () => {
    await api.functional.shoppingMall.administrator.categories.update(
      adminConnection,
      {
        categoryId: subcategoryA.id,
        body: {
          name: subcategoryB.name,
        } satisfies IShoppingMallCategory.IUpdate,
      },
    );
  });
  // 7. Verify subcategoryA still has its original name (update was rejected)
  const subcategoryAAfterAttempt =
    await api.functional.shoppingMall.administrator.categories.update(
      adminConnection,
      {
        categoryId: subcategoryA.id,
        body: {
          description: RandomGenerator.content({ paragraphs: 1 }),
        } satisfies IShoppingMallCategory.IUpdate,
      },
    );
  typia.assert(subcategoryAAfterAttempt);
  TestValidator.equals(
    "subcategoryA name unchanged after rejected update",
    subcategoryAAfterAttempt.name,
    subcategoryA.name,
  );
}
