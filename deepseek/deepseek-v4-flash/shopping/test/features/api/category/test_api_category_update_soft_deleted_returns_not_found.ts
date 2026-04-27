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

/**
 * Test that updating a soft-deleted category returns 404 Not Found.
 *
 * Validates the business rule that only active (non-deleted) categories can be updated. A soft-deleted category is considered logically absent and any mutation must be rejected.
 *
 * 1. Authenticate as a super administrator via the join endpoint, capturing JWT credentials on the connection.
 * 2. Create a top-level category through the category creation API.
 * 3. Soft-delete the category via the erase endpoint, which sets a non-null deleted_at timestamp.
 * 4. Attempt to update the deleted category and assert a 404 Not Found error is returned.
 *
 * @param connection Base connection to the backend server.
 */
export async function test_api_category_update_soft_deleted_returns_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_join(superAdminConnection, {});
  // 2. Create a category
  const category =
    await generate_random_e_commerce_mall_super_administrator_categories_create(
      superAdminConnection,
      {},
    );
  typia.assert(category);
  // 3. Soft-delete the category
  await api.functional.eCommerceMall.superAdministrator.categories.erase(
    superAdminConnection,
    {
      categoryId: category.id,
    },
  );
  // 4. Attempt to update the soft-deleted category — expect 404
  await TestValidator.httpError(
    "update soft-deleted category",
    404,
    async () => {
      await api.functional.eCommerceMall.superAdministrator.categories.update(
        superAdminConnection,
        {
          categoryId: category.id,
          body: { name: "Fashion" } satisfies IECommerceMallCategory.IUpdate,
        },
      );
    },
  );
}
