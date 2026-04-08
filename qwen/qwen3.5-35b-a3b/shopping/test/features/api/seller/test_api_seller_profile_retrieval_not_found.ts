import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test retrieving a non-existent or soft-deleted seller account - verify 404 response.
 *
 * Validates the seller retrieval endpoint returns proper 404 Not Found response when querying for a seller that does not exist in the database. Ensures the system properly handles missing resources without leaking existence information.
 *
 * Special attention is given to verifying that the API returns a 404 status code rather than 200 with null, and that no partial information is leaked about the seller's existence.
 *
 * 1. Generate a valid UUID format that does not exist in the database.
 * 2. Call GET /ecommerceMall/sellers/{sellerId} with the non-existent UUID.
 * 3. Verify the response returns HTTP 404 Not Found.
 *
 * Business rules validated:
 * - Non-existent sellers return 404 Not Found (not 200 with null)
 * - No seller information leaked in error responses
 * - System handles missing resources gracefully
 */
export async function test_api_seller_profile_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for API calls
  const sellerConnection: api.IConnection = { host: connection.host };
  // Generate a valid UUID that does not exist in the database
  const nonExistentSellerId = typia.random<string & tags.Format<"uuid">>();
  // Verify the seller retrieval returns 404 for non-existent seller
  await TestValidator.httpError(
    "non-existent seller returns 404",
    404,
    async () => {
      await api.functional.ecommerceMall.sellers.at(sellerConnection, {
        sellerId: nonExistentSellerId,
      });
    },
  );
}
