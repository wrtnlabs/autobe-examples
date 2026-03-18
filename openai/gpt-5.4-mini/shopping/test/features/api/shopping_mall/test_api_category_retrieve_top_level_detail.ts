import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_category_retrieve_top_level_detail(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      href: "https://example.com/register",
      referrer: "https://example.com/",
      ip: "127.0.0.1",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const category = await api.functional.shoppingMall.categories.at(
    customerConnection,
    {
      categoryId,
    },
  );
  typia.assert(category);
  TestValidator.equals("category id", category.id, categoryId);
  TestValidator.equals("top-level category parent", category.parent, null);
  TestValidator.predicate("category name exists", category.name.length > 0);
  TestValidator.predicate(
    "category description exists",
    category.description.length > 0,
  );
  TestValidator.predicate(
    "category created_at exists",
    category.created_at.length > 0,
  );
  TestValidator.predicate(
    "category updated_at exists",
    category.updated_at.length > 0,
  );
  TestValidator.equals("active category deleted_at", category.deleted_at, null);
}
