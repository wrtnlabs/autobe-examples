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

export async function test_api_category_snapshot_route_reads_active_category_detail(
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
  const parentCategory =
    await generate_random_shopping_mall_administrator_categories_create(
      administratorConnection,
      {
        body: {
          name: `top-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          parentId: null,
        },
      },
    );
  typia.assert(parentCategory);
  const firstChild =
    await generate_random_shopping_mall_administrator_categories_create(
      administratorConnection,
      {
        body: {
          name: `child-a-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          parentId: parentCategory.id,
        },
      },
    );
  typia.assert(firstChild);
  const secondChild =
    await generate_random_shopping_mall_administrator_categories_create(
      administratorConnection,
      {
        body: {
          name: `child-b-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          parentId: parentCategory.id,
        },
      },
    );
  typia.assert(secondChild);
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const detail =
    await api.functional.shoppingMall.administrator.categories.snapshots.at(
      administratorConnection,
      {
        categoryId: parentCategory.id,
        snapshotId,
      },
    );
  typia.assert(detail);
  TestValidator.equals(
    "parent category id matches",
    detail.id,
    parentCategory.id,
  );
  TestValidator.equals(
    "parent category name matches",
    detail.name,
    parentCategory.name,
  );
  TestValidator.equals(
    "parent category description matches",
    detail.description,
    parentCategory.description,
  );
  TestValidator.equals("top-level parent is null", detail.parent, null);
  TestValidator.equals(
    "active category deleted_at is null",
    detail.deleted_at,
    null,
  );
  TestValidator.equals(
    "created_at reflects live category state",
    detail.created_at,
    parentCategory.created_at,
  );
  TestValidator.equals(
    "updated_at reflects live category state",
    detail.updated_at,
    parentCategory.updated_at,
  );
  TestValidator.equals(
    "immediate child count matches",
    detail.children.length,
    2,
  );
  TestValidator.equals(
    "child id set matches direct children only",
    detail.children.map((child) => child.id).sort(),
    [firstChild.id, secondChild.id].sort(),
  );
  const reread =
    await api.functional.shoppingMall.administrator.categories.snapshots.at(
      administratorConnection,
      {
        categoryId: parentCategory.id,
        snapshotId,
      },
    );
  typia.assert(reread);
  TestValidator.equals(
    "snapshot route read is side-effect free",
    reread,
    detail,
  );
}
