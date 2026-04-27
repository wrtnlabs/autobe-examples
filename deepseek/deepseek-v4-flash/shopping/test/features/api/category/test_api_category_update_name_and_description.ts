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

export async function test_api_category_update_name_and_description(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as superAdministrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_join(adminConnection, {
    body: {},
  });
  // 2. Create a top-level category with known name and description
  const created =
    await generate_random_e_commerce_mall_super_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: "Electronics",
          description: "Electronic devices and accessories",
        },
      },
    );
  typia.assert(created);
  // 3. Update the category name and description
  const updated =
    await api.functional.eCommerceMall.superAdministrator.categories.update(
      adminConnection,
      {
        categoryId: created.id,
        body: {
          name: "Consumer Electronics",
          description: "Consumer electronic devices, gadgets, and accessories",
        } satisfies IECommerceMallCategory.IUpdate,
      },
    );
  typia.assert(updated);
  // 4. Assert response field values
  TestValidator.equals("name", updated.name, "Consumer Electronics");
  TestValidator.equals(
    "description",
    updated.description,
    "Consumer electronic devices, gadgets, and accessories",
  );
  TestValidator.predicate(
    "updated_at newer than created_at",
    updated.updated_at > created.updated_at,
  );
  TestValidator.equals("parent remains null", updated.parent, null);
  TestValidator.equals("deleted_at is null", updated.deleted_at, null);
}
