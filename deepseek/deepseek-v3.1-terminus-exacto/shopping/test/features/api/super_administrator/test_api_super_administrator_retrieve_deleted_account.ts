import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_super_administrator_retrieve_deleted_account(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random super administrator ID
  const superAdministratorId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve the super administrator using the API
  const superAdmin = await api.functional.ecommerce.super_administrators.at(
    connection,
    { superAdministratorId },
  );
  // Validate the response structure
  typia.assert(superAdmin);
  // Validate that the returned object contains all required fields
  TestValidator.equals(
    "ID matches request",
    superAdmin.id,
    superAdministratorId,
  );
  TestValidator.predicate(
    "email is string",
    typeof superAdmin.email === "string",
  );
  TestValidator.predicate(
    "created_at is ISO string",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(superAdmin.created_at),
  );
  TestValidator.predicate(
    "updated_at is ISO string",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(superAdmin.updated_at),
  );
  // Validate deletion field (may be null or ISO string)
  if (superAdmin.deleted_at !== null) {
    TestValidator.predicate(
      "deleted_at is ISO string when not null",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(superAdmin.deleted_at),
    );
  }
  // Validate email format
  TestValidator.predicate(
    "email has valid format",
    /^[^@]+@[^@]+\.[^@]+$/.test(superAdmin.email),
  );
}
