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

export async function test_api_category_update_subcategory_partial(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  // 2. Create a top-level category
  const topLevelCategoryName = "Electronics";
  const topLevelCategoryDescription = "Electronic devices and accessories";
  const topLevelCategory =
    await generate_random_e_commerce_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: topLevelCategoryName,
          description: topLevelCategoryDescription,
          parent_id: null,
        },
      },
    );
  typia.assert(topLevelCategory);
  // 3. Create a subcategory under the top-level category
  const subcategoryName = "Smartphones";
  const subcategoryDescription = "Mobile phones and accessories";
  const subcategory =
    await generate_random_e_commerce_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: subcategoryName,
          description: subcategoryDescription,
          parent_id: topLevelCategory.id,
        },
      },
    );
  typia.assert(subcategory);
  // 4. Partially update the subcategory: update only the name, description omitted
  const newName = "Premium Electronics";
  const updated =
    await api.functional.eCommerceMall.administrator.categories.update(
      adminConnection,
      {
        categoryId: subcategory.id,
        body: {
          name: newName,
        } satisfies IECommerceMallCategory.IUpdate,
      },
    );
  typia.assert(updated);
  // 5. Validate the update
  // 5.1. Name should be updated to the new name
  TestValidator.equals("name updated", updated.name, newName);
  // 5.2. Description should remain unchanged from the original subcategory creation
  TestValidator.equals(
    "description preserved",
    updated.description,
    subcategoryDescription,
  );
  // 5.3. Parent relationship should be unchanged - still references the original top-level category
  TestValidator.equals(
    "parent id unchanged",
    updated.parent?.id,
    topLevelCategory.id,
  );
}
