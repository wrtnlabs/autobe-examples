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

/**
 * Test that updating a soft-deleted category throws a 404 Not Found error.
 *
 * Verifies that after an administrator creates and then soft-deletes a category, any subsequent attempt to update that category's name or description is rejected with a 404 Not Found response. This ensures the system correctly distinguishes between active (non-deleted) and soft-deleted categories for mutation operations.
 *
 * The test validates the invariant that soft-deleted categories are immutable through the update endpoint — only administrators may update categories, and only categories with a null deleted_at timestamp can be updated.
 *
 * 1. Administrator joins the platform to obtain authenticated access.
 * 2. Administrator creates a new category with name and description.
 * 3. Administrator soft-deletes the created category.
 * 4. Administrator attempts to update the soft-deleted category with a new name.
 * 5. The update request is rejected with a 404 Not Found error.
 */
export async function test_api_category_update_deleted_category_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  // 2. Create a category
  const category: IECommerceMallCategory =
    await generate_random_e_commerce_mall_administrator_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 3. Delete (soft-delete) the category
  await api.functional.eCommerceMall.administrator.categories.erase(
    adminConnection,
    {
      categoryId: category.id,
    },
  );
  // 4. Attempt to update the deleted category — expect 404
  await TestValidator.httpError("update deleted category", 404, async () => {
    await api.functional.eCommerceMall.administrator.categories.update(
      adminConnection,
      {
        categoryId: category.id,
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.name(),
        } satisfies IECommerceMallCategory.IUpdate,
      },
    );
  });
}
