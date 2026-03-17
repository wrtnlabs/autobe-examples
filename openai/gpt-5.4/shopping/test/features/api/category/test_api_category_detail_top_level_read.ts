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

export async function test_api_category_detail_top_level_read(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = {
    host: connection.host,
  };
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdministrator.IJoin;
  const administrator = await authorize_administrator_join(
    administratorConnection,
    {
      body: joinInput,
    },
  );
  typia.assert(administrator);
  TestValidator.equals(
    "administrator email matches join input",
    administrator.email,
    joinInput.email,
  );
  TestValidator.equals(
    "new administrator is not deleted",
    administrator.deleted_at,
    null,
  );
  const TOP_LEVEL_CATEGORY_FIXTURE_ID =
    "00000000-0000-0000-0000-000000000001" as string & tags.Format<"uuid">;
  const category =
    await api.functional.shoppingMall.administrator.categories.at(
      administratorConnection,
      {
        categoryId: TOP_LEVEL_CATEGORY_FIXTURE_ID,
      },
    );
  typia.assert(category);
  TestValidator.equals(
    "category id matches fixture",
    category.id,
    TOP_LEVEL_CATEGORY_FIXTURE_ID,
  );
  TestValidator.equals(
    "top-level category has null parent",
    category.parent,
    null,
  );
  TestValidator.equals("category is active", category.deleted_at, null);
  TestValidator.predicate(
    "children do not include the category itself",
    category.children.every((child) => child.id !== category.id),
  );
  TestValidator.predicate(
    "children are immediate summaries of this top-level category",
    category.children.every(
      (child) => child.parent !== null && child.parent.id === category.id,
    ),
  );
}
