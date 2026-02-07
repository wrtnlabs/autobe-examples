import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomyPoliticsBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_superadmin_retrieve_deleted(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random UUID for the super admin ID
  const superAdminId = typia.random<string>();
  // Retrieve the soft-deleted super admin
  const superAdmin = await api.functional.economyPoliticsBoard.superadmins.at(
    connection,
    {
      superAdminId: superAdminId satisfies string,
    },
  );
  // Assert the response structure
  typia.assert(superAdmin);
  // Verify all required fields are present
  TestValidator.equals(
    "superAdmin.id should match",
    superAdmin.id,
    superAdminId,
  );
  TestValidator.notEquals(
    "superAdmin.email should not be empty",
    superAdmin.email,
    "",
  );
  // Verify timestamps
  TestValidator.predicate("created_at should be valid date-time format", () =>
    isValidDateTime(superAdmin.created_at),
  );
  TestValidator.predicate("updated_at should be valid date-time format", () =>
    isValidDateTime(superAdmin.updated_at),
  );
  // Verify deleted_at is not null and is a valid date-time format
  TestValidator.predicate(
    "deleted_at should not be null",
    superAdmin.deleted_at !== null,
  );
  TestValidator.predicate(
    "deleted_at should be valid date-time format",
    () => superAdmin.deleted_at != null && isValidDateTime(superAdmin.deleted_at),
  );
  function isValidDateTime(dateString: string): boolean {
    return new Date(dateString).toISOString() === dateString;
  }
}