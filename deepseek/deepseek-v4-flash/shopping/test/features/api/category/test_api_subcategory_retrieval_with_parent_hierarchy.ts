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

export async function test_api_subcategory_retrieval_with_parent_hierarchy(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  typia.assert(admin);
  // 2. Create a top-level category (no parent_id → null by default)
  const parentCategory =
    await generate_random_e_commerce_mall_administrator_categories_create(
      adminConnection,
      {},
    );
  typia.assert(parentCategory);
  // 3. Create a subcategory under the top-level parent
  const subcategory =
    await generate_random_e_commerce_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          parent_id: parentCategory.id,
        },
      },
    );
  typia.assert(subcategory);
  // 4. Retrieve the subcategory by its ID
  const retrieved =
    await api.functional.eCommerceMall.administrator.categories.at(
      adminConnection,
      {
        categoryId: subcategory.id,
      },
    );
  typia.assert(retrieved);
  // 5. Validate subcategory identity
  TestValidator.equals("subcategory id", retrieved.id, subcategory.id);
  TestValidator.equals("subcategory name", retrieved.name, subcategory.name);
  // 6. Validate parent hierarchy
  TestValidator.predicate("parent is not null", retrieved.parent !== null);
  if (retrieved.parent) {
    TestValidator.equals("parent id", retrieved.parent.id, parentCategory.id);
    TestValidator.equals(
      "parent name",
      retrieved.parent.name,
      parentCategory.name,
    );
    TestValidator.equals(
      "parent description",
      retrieved.parent.description,
      parentCategory.description,
    );
    TestValidator.predicate(
      "parent's parent is null (top-level)",
      retrieved.parent.parent === null,
    );
  }
  // 7. Validate lifecycle timestamps
  TestValidator.equals(
    "deleted_at is null (active category)",
    retrieved.deleted_at,
    null,
  );
}
