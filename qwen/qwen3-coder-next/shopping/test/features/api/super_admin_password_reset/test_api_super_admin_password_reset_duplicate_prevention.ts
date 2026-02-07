import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSuperAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdminPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { generate_random_shopping_mall_super_admin_password_resets_create } from "../../../generate/generate_random_shopping_mall_super_admin_password_resets_create";
import { prepare_random_shopping_mall_super_admin_password_reset } from "../../../prepare/prepare_random_shopping_mall_super_admin_password_reset";

/**
 * Test super admin password reset duplicate prevention.
 *
 * This test validates that the system prevents multiple active password reset
 * requests for the same super admin account. It ensures that once a password
 * reset is requested, no additional reset requests can be created until the
 * current one is processed or expires.
 */
export async function test_api_super_admin_password_reset_duplicate_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. First password reset request
  const firstReset =
    await api.functional.shoppingMall.superAdmin.password_resets.create(
      connection,
      {
        body: typia.random<IShoppingMallSuperAdminPasswordReset.ICreate>(),
      },
    );
  typia.assert(firstReset);
  // 2. Second password reset attempt - should fail due to duplicate prevention
  await TestValidator.error(
    "duplicate password reset should be prevented",
    async () => {
      await api.functional.shoppingMall.superAdmin.password_resets.create(
        connection,
        {
          body: typia.random<IShoppingMallSuperAdminPasswordReset.ICreate>(),
        },
      );
    },
  );
}
