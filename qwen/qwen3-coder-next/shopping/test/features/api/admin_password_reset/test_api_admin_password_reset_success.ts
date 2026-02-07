import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdminPasswordResetRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPasswordResetRequest";
import type { IShoppingMallAdminPasswordResetResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPasswordResetResponse";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_admin_password_reset_success(
  connection: api.IConnection,
): Promise<void> {
  // Create admin-specific connection (isolated from base connection)
  const adminConnection: api.IConnection = { host: connection.host };
  // Step 1: Admin submits valid registered email address
  const requestBody = {
    email: "admin@test.com",
  } satisfies IShoppingMallAdminPasswordResetRequest;
  // Step 2-6: System validates, generates token, stores hash, sends email, returns success
  const result =
    await api.functional.shoppingMall.admin.password_resets.createPasswordReset(
      adminConnection,
      {
        body: requestBody,
      },
    );
  // Step 7: Validate response structure
  typia.assert(result);
}
