import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_e_commerce_mall_super_administrator_categories_create } from "../../../generate/generate_random_e_commerce_mall_super_administrator_categories_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";

export async function test_api_subcategory_update_partial_name_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as superAdministrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  typia.assert(authorized);
  // 2. Create a top-level category
  const topLevelCategory =
    await generate_random_e_commerce_mall_super_administrator_categories_create(
      superAdminConnection,
      {
        body: {
          name: "Electronics",
          description: "Electronic devices and accessories",
        },
      },
    );
  typia.assert(topLevelCategory);
  // 3. Create a subcategory under the top-level parent
  const subCategory =
    await generate_random_e_commerce_mall_super_administrator_categories_create(
      superAdminConnection,
      {
        body: {
          name: "Smartphones",
          description: "Mobile phones and accessories",
          parent_id: topLevelCategory.id,
        },
      },
    );
  typia.assert(subCategory);
  // 4. Update only the subcategory's name (no description field)
  const updated =
    await api.functional.eCommerceMall.superAdministrator.categories.update(
      superAdminConnection,
      {
        categoryId: subCategory.id,
        body: {
          name: "Mobile Phones",
        } satisfies IECommerceMallCategory.IUpdate,
      },
    );
  typia.assert(updated);
  // 5. Validate the update
  TestValidator.equals("name updated", updated.name, "Mobile Phones");
  TestValidator.equals(
    "description preserved",
    updated.description,
    "Mobile phones and accessories",
  );
  TestValidator.predicate("parent exists", updated.parent !== null);
  TestValidator.equals(
    "parent id matches",
    updated.parent!.id,
    topLevelCategory.id,
  );
  TestValidator.equals(
    "parent name matches",
    updated.parent!.name,
    topLevelCategory.name,
  );
  TestValidator.predicate(
    "updated_at advanced",
    () =>
      new Date(updated.updated_at).getTime() >
      new Date(subCategory.created_at).getTime(),
  );
}
