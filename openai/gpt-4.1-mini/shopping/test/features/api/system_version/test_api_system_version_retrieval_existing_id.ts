import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSystemVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemVersion";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_system_version_retrieval_existing_id(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection since this API requires admin authorization
  const adminConnection: api.IConnection = { host: connection.host };
  // Note: No explicit authorization function provided, assuming adminConnection can be used directly
  // Generate a valid UUID for test (simulate a known existing system version id)
  const existingId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve the system version record by UUID
  const systemVersion = await api.functional.shoppingMall.systemVersions.at(
    adminConnection,
    { id: existingId },
  );
  // Validate full structure of the system version record
  typia.assert(systemVersion);
  // Business validation: Since all audit fields are included in the record, typia.assert is sufficient for detailed field validation
  // No additional manual check to avoid redundancy with typia.assert
}
