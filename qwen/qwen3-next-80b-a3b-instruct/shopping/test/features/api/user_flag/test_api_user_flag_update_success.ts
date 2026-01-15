import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallUserFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserFlag";
export async function test_api_user_flag_update_success(
  connection: api.IConnection,
): Promise<void> {
  // Following the Connection Isolation Pattern - create new connection with same host
  const userConnection: api.IConnection = { host: connection.host };
  // The API endpoint accepts a single IRequest object, not an array as incorrectly implemented before
  // Create a single flag update request as specified in the API schema
  const flagUpdate: IShoppingMallUserFlag.IRequest = {
    flagName: "disableNotifications",
    flagValue: true,
  };
  // Send the single flag update as the request body
  const response: IShoppingMallUserFlag.IResponse =
    await api.functional.shoppingMall.user.flags.index(userConnection, {
      body: flagUpdate,
    });
  // Validate response structure and content
  typia.assert(response);
  // Verify success status is true
  TestValidator.equals(
    "success should be true when flag is processed",
    response.success,
    true,
  );
  // Verify that the requested flag is included in updatedFlags array
  TestValidator.equals(
    "one flag should be updated",
    response.updatedFlags.length,
    1,
  );
  // Verify warnings array is empty since the flag is valid
  TestValidator.equals(
    "no warnings should be present for successful update",
    response.warnings,
    [],
  );
  // Verify the updated flag matches what was requested
  const updatedFlag = response.updatedFlags[0];
  typia.assert(updatedFlag);
  TestValidator.equals(
    "updated flag name matches request",
    updatedFlag.flagName,
    flagUpdate.flagName,
  );
  TestValidator.equals(
    "updated flag value matches request",
    updatedFlag.flagValue,
    flagUpdate.flagValue,
  );
}
