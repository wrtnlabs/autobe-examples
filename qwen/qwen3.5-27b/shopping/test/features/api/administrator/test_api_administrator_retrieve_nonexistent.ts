import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test that retrieving a non-existent administrator returns a 404 Not Found error.
 *
 * Validates that the administrator retrieval endpoint properly handles requests for administrators that do not exist in the system. The test generates a random UUID and attempts to retrieve an administrator with that ID, expecting the API to return a 404 Not Found error.
 *
 * 1. Generate a random UUID that does not exist in the system
 * 2. Call GET /shoppingMall/administrators/{administratorId} with the non-existent UUID
 * 3. Verify the API throws an HttpError with status 404
 * 4. Confirm the error indicates the administrator was not found
 */
export async function test_api_administrator_retrieve_nonexistent(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection from base connection
  const adminConnection: api.IConnection = { host: connection.host };
  // 1. Generate a random non-existent administrator ID
  const nonExistentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 2. Attempt to retrieve the non-existent administrator
  // 3. Verify the API throws 404 Not Found error
  await TestValidator.httpError(
    "retrieving non-existent administrator returns 404",
    404,
    async () =>
      await api.functional.shoppingMall.administrators.at(adminConnection, {
        administratorId: nonExistentId,
      }),
  );
}
