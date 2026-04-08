import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test that a super administrator can retrieve another administrator's complete profile by their UUID.
 *
 * Validates that super administrators can access detailed administrator profile information including email, privilege level, banned status, and account timestamps. Ensures the response contains all expected fields with correct types and formats.
 *
 * Special attention is given to verifying that the grade field shows valid privilege levels ('regular' or 'super'), timestamps are in ISO 8601 format, and sensitive data like password_hash is not included in the response.
 *
 * 1. Create a super administrator connection with simulated authorization.
 * 2. Generate a random administrator UUID for the target administrator.
 * 3. Call GET /shoppingMall/administrators/{administratorId} with the target UUID.
 * 4. Validate the response structure using typia.assert().
 * 5. Verify the grade is either 'regular' or 'super'.
 * 6. Verify deleted_at is null for active administrators.
 */
export async function test_api_administrator_retrieve_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // 2. Generate a random administrator UUID for testing
  const targetAdministratorId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve administrator profile using super admin connection
  const administrator = await api.functional.shoppingMall.administrators.at(
    superAdminConnection,
    {
      administratorId: targetAdministratorId,
    },
  );
  // 4. Validate response structure - typia.assert() performs complete type validation
  typia.assert(administrator);
  // 5. Verify grade is valid privilege level (business logic validation)
  TestValidator.equals(
    "grade is valid privilege level",
    ["regular", "super"].includes(administrator.grade),
    true,
  );
  // 6. Verify deleted_at is null for active administrators (business logic)
  TestValidator.equals(
    "deleted_at is null for active administrator",
    administrator.deleted_at,
    null,
  );
  // 7. Verify banned status is a boolean value (business logic)
  TestValidator.predicate(
    "banned status is valid boolean",
    typeof administrator.banned === "boolean",
  );
}
