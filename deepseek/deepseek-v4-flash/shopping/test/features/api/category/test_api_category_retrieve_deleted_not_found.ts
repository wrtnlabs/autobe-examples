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
 * Test that retrieving a soft-deleted category returns 404 Not Found.
 *
 * Validates that the GET category endpoint properly excludes soft-deleted records via the `WHERE deleted_at IS NULL` query condition. After authenticating as a super administrator, a category is created and then soft-deleted. Attempting to retrieve the deleted category must result in a 404 Not Found error, confirming the soft-delete behavior preserves data integrity for historical snapshot references while hiding the record from active queries.
 *
 * 1. Authenticate as a super administrator via the join endpoint.
 * 2. Create a category via the create endpoint.
 * 3. Soft-delete the category via the delete endpoint.
 * 4. Attempt to retrieve the deleted category and expect 404 Not Found.
 */
export async function test_api_category_retrieve_deleted_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_join(superAdminConnection, {});
  // 2. Create a category
  const category: IECommerceMallCategory =
    await generate_random_e_commerce_mall_super_administrator_categories_create(
      superAdminConnection,
      {},
    );
  typia.assert(category);
  // 3. Soft-delete the category
  await api.functional.eCommerceMall.superAdministrator.categories.erase(
    superAdminConnection,
    { categoryId: category.id },
  );
  // 4. Attempt to retrieve the deleted category — expect 404 Not Found
  await TestValidator.httpError(
    "retrieve deleted category",
    404,
    async () =>
      await api.functional.eCommerceMall.superAdministrator.categories.at(
        superAdminConnection,
        { categoryId: category.id },
      ),
  );
}
