import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_super_administrator_retrieve_active_account(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random UUID for the test
  const superAdministratorId = typia.random<string & tags.Format<"uuid">>();
  // Call the API to retrieve super administrator details
  const admin = await api.functional.ecommerce.super_administrators.at(
    connection,
    { superAdministratorId },
  );
  // Validate the complete response structure
  typia.assert(admin);
  // Validate that deleted_at is null, indicating an active account
  TestValidator.equals(
    "deleted_at should be null for active account",
    admin.deleted_at,
    null,
  );
}
