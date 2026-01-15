import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallUserFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserFlag";
export async function test_api_user_flag_update_unknown_flag(
  connection: api.IConnection,
): Promise<void> {
  // Test handling of unknown flag names with single update per request
  // API expects a single IRequest object, not an array
  // Create an unknown flag name (not expecting any to be recognized)
  const unknownFlagName = "unknownFlag_" + RandomGenerator.alphaNumeric(10);
  // Create a single request with unknown flag name
  // This matches the API's IRequest interface exactly
  const updateRequest: IShoppingMallUserFlag.IRequest = {
    flagName: unknownFlagName,
    flagValue: RandomGenerator.pick([
      true,
      false,
      RandomGenerator.alphaNumeric(15),
    ]),
  };
  // Execute the flag update
  const response: IShoppingMallUserFlag.IResponse =
    await api.functional.shoppingMall.user.flags.index(connection, {
      body: updateRequest,
    });
  // Validate response structure (ensures type safety)
  typia.assert(response);
  // Assert that success is true - system ignores invalid flag names without failing
  TestValidator.equals(
    "success should be true for unknown flag update",
    response.success,
    true,
  );
  // Validate that warnings array contains exactly one entry with the unknown flag name
  TestValidator.equals(
    "warnings array should have exactly one entry",
    response.warnings?.length,
    1,
  );
  // Verify the warning message contains the unknown flag name
  if (response.warnings && response.warnings.length === 1) {
    TestValidator.predicate(
      "warning message contains the unknown flag name",
      response.warnings[0].includes(unknownFlagName),
    );
    // Verify message contains rejection indicator
    TestValidator.predicate(
      "warning message contains a rejection indicator",
      response.warnings[0].toLowerCase().includes("ignore") ||
        response.warnings[0].toLowerCase().includes("unknown"),
    );
  }
  // Validate that updatedFlags array is empty since the flag was unknown
  TestValidator.equals(
    "updatedFlags should be empty for unknown flag",
    response.updatedFlags.length,
    0,
  );
  // The flagValue type check is already covered by typia.assert
  // as it validates the entire IResponse structure
}
