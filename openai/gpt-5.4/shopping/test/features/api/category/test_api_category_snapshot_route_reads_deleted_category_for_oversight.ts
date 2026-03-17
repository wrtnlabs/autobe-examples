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

export async function test_api_category_snapshot_route_reads_deleted_category_for_oversight(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = {
    host: connection.host,
  };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const createdCategory =
    await generate_random_shopping_mall_administrator_categories_create(
      administratorConnection,
      {
        body: {
          name: `category-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 6 }),
          parentId: null,
        },
      },
    );
  typia.assert(createdCategory);
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  await api.functional.shoppingMall.administrator.categories.erase(
    administratorConnection,
    {
      categoryId: createdCategory.id,
    },
  );
  const deletedCategory =
    await api.functional.shoppingMall.administrator.categories.snapshots.at(
      administratorConnection,
      {
        categoryId: createdCategory.id,
        snapshotId,
      },
    );
  typia.assert(deletedCategory);
  TestValidator.equals(
    "deleted category id is preserved in oversight read",
    deletedCategory.id,
    createdCategory.id,
  );
  TestValidator.equals(
    "deleted category name is preserved in oversight read",
    deletedCategory.name,
    createdCategory.name,
  );
  TestValidator.equals(
    "deleted category description is preserved in oversight read",
    deletedCategory.description,
    createdCategory.description,
  );
  TestValidator.equals(
    "top-level parent remains null after deletion",
    deletedCategory.parent,
    null,
  );
  TestValidator.equals(
    "top-level category still has no children after oversight read",
    deletedCategory.children.length,
    0,
  );
  TestValidator.predicate(
    "deleted_at is populated for deleted category oversight read",
    deletedCategory.deleted_at !== null,
  );
  const repeatedRead =
    await api.functional.shoppingMall.administrator.categories.snapshots.at(
      administratorConnection,
      {
        categoryId: createdCategory.id,
        snapshotId,
      },
    );
  typia.assert(repeatedRead);
  TestValidator.equals(
    "repeated oversight read keeps category id stable",
    repeatedRead.id,
    deletedCategory.id,
  );
  TestValidator.equals(
    "repeated oversight read keeps category name stable",
    repeatedRead.name,
    deletedCategory.name,
  );
  TestValidator.equals(
    "repeated oversight read keeps category description stable",
    repeatedRead.description,
    deletedCategory.description,
  );
  TestValidator.equals(
    "repeated oversight read keeps parent stable",
    repeatedRead.parent,
    deletedCategory.parent,
  );
  TestValidator.equals(
    "repeated oversight read keeps child count stable",
    repeatedRead.children.length,
    deletedCategory.children.length,
  );
  TestValidator.equals(
    "repeated oversight read keeps deletion timestamp stable",
    repeatedRead.deleted_at,
    deletedCategory.deleted_at,
  );
}
