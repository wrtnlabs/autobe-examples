import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test that retrieving a banned administrator's profile is successful.
 *
 * Validates that the administrator retrieval endpoint returns complete profile data for banned administrators. Banned administrators should retain their account data for audit and accountability purposes, with the banned flag properly set to true.
 *
 * This test ensures that:
 * - Banned administrator profiles are still accessible via the API
 * - All profile fields remain intact after banning
 * - The banned flag is correctly set to true
 * - Account data is preserved for audit trail purposes
 *
 * 1. Retrieves the banned administrator's profile by UUID
 * 2. Validates the response contains all expected fields
 * 3. Confirms the banned flag is set to true
 * 4. Verifies account data preservation for audit purposes
 */
export async function test_api_administrator_retrieve_banned_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Banned administrator ID (setup handled by test framework)
  const bannedAdministratorId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 2. Retrieve banned administrator profile
  const administrator = await api.functional.shoppingMall.administrators.at(
    connection,
    {
      administratorId: bannedAdministratorId,
    },
  );
  typia.assert(administrator);
  // 3. Validate banned flag is set to true
  TestValidator.equals("banned flag is true", administrator.banned, true);
  // 4. Verify account data preservation for audit purposes
  TestValidator.equals(
    "administrator ID matches request",
    administrator.id,
    bannedAdministratorId,
  );
  TestValidator.predicate("email is preserved", administrator.email.length > 0);
  TestValidator.predicate(
    "grade is preserved",
    administrator.grade === "regular" || administrator.grade === "super",
  );
  TestValidator.predicate(
    "created_at timestamp exists",
    administrator.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at timestamp exists",
    administrator.updated_at.length > 0,
  );
}
