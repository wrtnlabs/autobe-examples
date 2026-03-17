import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_administrator_categories_create } from "../../../generate/generate_random_shopping_mall_administrator_categories_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";

export async function test_api_category_update_administrator_only(
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
  const parentCategory =
    await generate_random_shopping_mall_administrator_categories_create(
      administratorConnection,
      {
        body: {
          name: `${RandomGenerator.name()}-${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          parentId: null,
        },
      },
    );
  typia.assert(parentCategory);
  const targetCategory =
    await generate_random_shopping_mall_administrator_categories_create(
      administratorConnection,
      {
        body: {
          name: `${RandomGenerator.name()}-${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph({ sentences: 4 }),
          parentId: parentCategory.id,
        },
      },
    );
  typia.assert(targetCategory);
  TestValidator.equals(
    "target category starts under parent",
    targetCategory.parent?.id,
    parentCategory.id,
  );
  const customerConnection: api.IConnection = {
    host: connection.host,
  };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customer);
  const forbiddenUpdate = {
    name: `${RandomGenerator.name()}-${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    parent_id: null,
  } satisfies IShoppingMallCategory.IUpdate;
  await TestValidator.httpError(
    "customer cannot update administrator category",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.administrator.categories.update(
        customerConnection,
        {
          categoryId: targetCategory.id,
          body: forbiddenUpdate,
        },
      );
    },
  );
  const updatedByAdministrator =
    await api.functional.shoppingMall.administrator.categories.update(
      administratorConnection,
      {
        categoryId: targetCategory.id,
        body: forbiddenUpdate,
      },
    );
  typia.assert(updatedByAdministrator);
  TestValidator.equals(
    "administrator update keeps same category id",
    updatedByAdministrator.id,
    targetCategory.id,
  );
  TestValidator.equals(
    "administrator update applies new name",
    updatedByAdministrator.name,
    forbiddenUpdate.name,
  );
  TestValidator.equals(
    "administrator update applies new description",
    updatedByAdministrator.description,
    forbiddenUpdate.description,
  );
  TestValidator.equals(
    "administrator update makes category top level",
    updatedByAdministrator.parent,
    null,
  );
}
