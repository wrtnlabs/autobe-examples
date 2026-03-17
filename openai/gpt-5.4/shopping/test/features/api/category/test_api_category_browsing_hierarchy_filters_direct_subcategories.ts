import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCategory";
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

export async function test_api_category_browsing_hierarchy_filters_direct_subcategories(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = {
    host: connection.host,
  };
  const administrator = await authorize_administrator_join(
    administratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(administrator);
  const topLevel =
    await generate_random_shopping_mall_administrator_categories_create(
      administratorConnection,
      {
        body: {
          name: `top-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(topLevel);
  const subcategory =
    await generate_random_shopping_mall_administrator_categories_create(
      administratorConnection,
      {
        body: {
          name: `sub-${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          parentId: topLevel.id,
        },
      },
    );
  typia.assert(subcategory);
  TestValidator.equals(
    "created top-level category has no parent",
    topLevel.parent,
    null,
  );
  TestValidator.equals(
    "created subcategory references selected parent",
    subcategory.parent !== null ? subcategory.parent.id : null,
    topLevel.id,
  );
  const topLevelPage =
    await api.functional.shoppingMall.administrator.categories.index(
      administratorConnection,
      {
        body: {
          isTopLevel: true,
          page: 1,
          limit: 100,
        } satisfies IShoppingMallCategory.IRequest,
      },
    );
  typia.assert(topLevelPage);
  TestValidator.predicate(
    "top-level query includes created top-level category",
    ArrayUtil.has(topLevelPage.data, (category) => category.id === topLevel.id),
  );
  topLevelPage.data.forEach((category) => {
    TestValidator.equals(
      `top-level result ${category.id} has null parent`,
      category.parent,
      null,
    );
  });
  const subcategoryPage =
    await api.functional.shoppingMall.administrator.categories.index(
      administratorConnection,
      {
        body: {
          parent_id: topLevel.id,
          isSubcategory: true,
          page: 1,
          limit: 100,
        } satisfies IShoppingMallCategory.IRequest,
      },
    );
  typia.assert(subcategoryPage);
  TestValidator.predicate(
    "subcategory query includes created direct child",
    ArrayUtil.has(
      subcategoryPage.data,
      (category) => category.id === subcategory.id,
    ),
  );
  subcategoryPage.data.forEach((category) => {
    TestValidator.equals(
      `subcategory result ${category.id} points to selected parent`,
      category.parent !== null ? category.parent.id : null,
      topLevel.id,
    );
    TestValidator.predicate(
      `subcategory result ${category.id} has a parent summary`,
      category.parent !== null,
    );
    if (category.parent !== null) {
      TestValidator.equals(
        `parent summary for ${category.id} does not expose deeper nesting`,
        category.parent.parent,
        null,
      );
    }
  });
}
