import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_e_commerce_mall_administrator_categories_create } from "../../../generate/generate_random_e_commerce_mall_administrator_categories_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";

export async function test_api_category_retrieval_top_level(
  connection: api.IConnection,
): Promise<void> {
  //----
  // PREPARE
  //----
  // 1. Authenticate as administrator
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
  // 2. Create a top-level category (no parent_id)
  const category: IECommerceMallCategory =
    await generate_random_e_commerce_mall_administrator_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  //----
  // EXECUTE
  //----
  // 3. Retrieve the category by its ID
  const retrieved: IECommerceMallCategory =
    await api.functional.eCommerceMall.administrator.categories.at(
      adminConnection,
      {
        categoryId: category.id,
      },
    );
  typia.assert(retrieved);
  //----
  // VALIDATE
  //----
  // 4. Validate the retrieved category matches the created one
  TestValidator.equals("category id", retrieved.id, category.id);
  TestValidator.equals("category name", retrieved.name, category.name);
  TestValidator.equals(
    "category description",
    retrieved.description,
    category.description,
  );
  TestValidator.equals(
    "parent is null for top-level category",
    retrieved.parent,
    null,
  );
  TestValidator.equals(
    "deleted_at is null for active category",
    retrieved.deleted_at,
    null,
  );
}
