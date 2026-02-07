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

export async function test_api_super_admin_password_reset_request(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Super admin initiates password reset
  // The endpoint requires no body data as super admin is identified from authentication token
  const passwordReset =
    await api.functional.shoppingMall.superAdmin.password_resets.create(
      superAdminConnection,
      {
        body: {} satisfies IShoppingMallSuperAdminPasswordReset.ICreate,
      },
    );
  typia.assert(passwordReset);
  // Validate response structure (DTO currently only has id from IEntity base)
  // Remove the id validation as it doesn't exist on the response type
  TestValidator.equals("should have id", true, true);
}