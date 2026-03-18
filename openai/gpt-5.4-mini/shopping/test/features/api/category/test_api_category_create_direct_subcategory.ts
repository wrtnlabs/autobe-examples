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

export async function test_api_category_create_direct_subcategory(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  let topLevelPage = await api.functional.shoppingMall.categories.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 100,
        parent_id: null,
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(topLevelPage);
  let parent = topLevelPage.data.find((category) => category.parent === null);
  if (parent === undefined) {
    parent =
      await generate_random_shopping_mall_administrator_categories_create(
        adminConnection,
        {
          body: {
            name: `top-${RandomGenerator.alphabets(8)}`,
            description: RandomGenerator.paragraph({ sentences: 3 }),
          } satisfies IShoppingMallCategory.ICreate,
        },
      );
    typia.assert(parent);
  }
  TestValidator.equals(
    "top-level parent should have no parent",
    parent.parent,
    null,
  );
  const childName = `${parent.name} ${RandomGenerator.alphabets(8)}`;
  const childDescription = RandomGenerator.paragraph({ sentences: 3 });
  const created =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: childName,
          description: childDescription,
          parent_id: parent.id,
        } satisfies IShoppingMallCategory.ICreate,
      },
    );
  typia.assert(created);
  TestValidator.equals("created category name", created.name, childName);
  TestValidator.equals(
    "created category description",
    created.description,
    childDescription,
  );
  TestValidator.predicate(
    "created category should reference the selected top-level parent",
    created.parent !== null && created.parent.id === parent.id,
  );
  TestValidator.equals(
    "created category immediate parent name",
    created.parent?.name,
    parent.name,
  );
  const subcategoryPage = await api.functional.shoppingMall.categories.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 100,
        parent_id: parent.id,
      } satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(subcategoryPage);
  TestValidator.predicate(
    "subcategory should appear in browsing results under the selected parent",
    subcategoryPage.data.some((category) => category.id === created.id),
  );
  TestValidator.predicate(
    "subcategory browsing result should remain one level deep",
    subcategoryPage.data.every(
      (category) =>
        category.parent !== null && category.parent.id === parent.id,
    ),
  );
}
