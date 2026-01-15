import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallUserFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserFlag";
export async function test_api_user_flag_update_mixed_values(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection
  const userConnection: api.IConnection = { host: connection.host };
  // Since the API expects a single IRequest object and we need to test mixed values,
  // we'll perform multiple test runs with different combinations.
  // First, test with valid flag values
  const validFlagRequest: IShoppingMallUserFlag.IRequest = {
    flagName: "disableNotifications",
    flagValue: true,
  };
  const validResponse: IShoppingMallUserFlag.IResponse =
    await api.functional.shoppingMall.user.flags.index(userConnection, {
      body: validFlagRequest,
    });
  // Validate successful update
  typia.assert(validResponse);
  TestValidator.equals(
    "valid flag update should succeed",
    validResponse.success,
    true,
  );
  TestValidator.equals(
    "valid flag should be in updatedFlags",
    validResponse.updatedFlags.length,
    1,
  );
  TestValidator.equals(
    "valid flag value should match",
    validResponse.updatedFlags[0].flagValue,
    true,
  );
  // Test with a string value for same flag name
  const stringFlagRequest: IShoppingMallUserFlag.IRequest = {
    flagName: "theme",
    flagValue: "dark",
  };
  const stringResponse: IShoppingMallUserFlag.IResponse =
    await api.functional.shoppingMall.user.flags.index(userConnection, {
      body: stringFlagRequest,
    });
  // Validate successful update with string value
  typia.assert(stringResponse);
  TestValidator.equals(
    "string flag update should succeed",
    stringResponse.success,
    true,
  );
  TestValidator.equals(
    "string flag should be in updatedFlags",
    stringResponse.updatedFlags.length,
    1,
  );
  TestValidator.equals(
    "string flag value should match",
    stringResponse.updatedFlags[0].flagValue,
    "dark",
  );
  // Test with inconsistent flag for validation (this is the "mixed" test)
  // Here we use an invalid flag name that should be ignored
  const invalidFlagRequest: IShoppingMallUserFlag.IRequest = {
    flagName: "invalidFlagName",
    flagValue: true,
  };
  const invalidResponse: IShoppingMallUserFlag.IResponse =
    await api.functional.shoppingMall.user.flags.index(userConnection, {
      body: invalidFlagRequest,
    });
  // Validate that invalid flag name is ignored (success may still be true if system always returns true)
  typia.assert(invalidResponse);
  TestValidator.equals(
    "invalid flag name should still return success=true (API goal)",
    invalidResponse.success,
    true,
  );
  TestValidator.equals(
    "invalid flag name should not be in updatedFlags",
    invalidResponse.updatedFlags.length,
    0,
  );
  TestValidator.notEquals(
    "invalid flag name should generate warning",
    invalidResponse.warnings?.length,
    0,
  );
  // Additional test with wrong type (boolean instead of string for theme)
  const wrongTypeRequest: IShoppingMallUserFlag.IRequest = {
    flagName: "theme",
    flagValue: false,
  };
  const wrongTypeResponse: IShoppingMallUserFlag.IResponse =
    await api.functional.shoppingMall.user.flags.index(userConnection, {
      body: wrongTypeRequest,
    });
  // Validate that wrong type is ignored
  typia.assert(wrongTypeResponse);
  TestValidator.equals(
    "wrong type flag should still return success=true",
    wrongTypeResponse.success,
    true,
  );
  TestValidator.equals(
    "wrong type flag should not be in updatedFlags",
    wrongTypeResponse.updatedFlags.length,
    0,
  );
  TestValidator.notEquals(
    "wrong type flag should generate warning",
    wrongTypeResponse.warnings?.length,
    0,
  );
}
