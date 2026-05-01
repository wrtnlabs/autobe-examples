import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";

/**
 * Test category name uniqueness enforcement within the same parent scope.
 *
 * Verifies that the system prevents duplicate category names at the same hierarchy level. When two top-level categories share identical names, the second creation attempt must be rejected with an error to maintain a clean product discovery taxonomy and prevent customer confusion.
 *
 * 1. Administrator registers and authenticates via the join endpoint.
 * 2. Creates a top-level category with a specific, deterministic name using the category generation utility.
 * 3. Attempts to create another top-level category with the identical name.
 * 4. Validates the duplicate creation is rejected, confirming the uniqueness constraint within the null parent scope for top-level categories.
 */
export async function test_api_category_create_duplicate_name_same_scope(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const categoryName = RandomGenerator.paragraph({ sentences: 2 });
  const firstCategory =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      { body: { name: categoryName } },
    );
  typia.assert(firstCategory);
  await TestValidator.error(
    "duplicate category name in same parent scope",
    async () => {
      await generate_random_shopping_mall_admin_categories_create(
        adminConnection,
        { body: { name: categoryName } },
      );
    },
  );
}
