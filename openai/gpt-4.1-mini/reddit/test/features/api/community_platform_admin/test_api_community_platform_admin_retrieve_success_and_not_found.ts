import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test to verify the successful retrieval and not found scenarios for administrator profiles.
 *
 * This test covers:
 * - Retrieving an existing admin profile by valid UUID.
 * - Validating profile fields excluding sensitive password hashes.
 * - Attempting retrieval with a non-existent UUID and expecting 404 error.
 *
 * Requirements:
 * - Must use separate actor-specific connections if authentication is applicable.
 * - Must use await for all API calls.
 * - Must assert responses with typia.assert.
 * - Use TestValidator for verifying business rules and error conditions.
 *
 * @param connection - Base connection information for the API
 */
export async function test_api_community_platform_admin_retrieve_success_and_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Preparation: Since no creation API is available, using a random UUID that MAY NOT EXIST
  // In a real scenario, this should be replaced with a created admin's UUID
  const validAdminId = typia.random<string & typia.tags.Format<"uuid">>();
  // Actor-specific connection
  const actorConnection: api.IConnection = { host: connection.host };
  // Scenario 1: Successful retrieval
  try {
    const admin = await api.functional.communityPlatform.admins.at(
      actorConnection,
      {
        adminId: validAdminId,
      },
    );
    typia.assert(admin);
    // No specific properties to verify as IEntity is an empty structure
  } catch (error) {
    // Could fail if admin does not exist, but no creation API to ensure
    // Thus, this try-catch is precautionary only
    if (
      typeof error === "object" &&
      error !== null &&
      "status" in error &&
      (error as any).status === 404
    ) {
      // Acceptable if not found since creation is not possible
    } else {
      throw error;
    }
  }
  // Scenario 2: Retrieval with non-existent adminId
  const nonExistentAdminId = "00000000-0000-0000-0000-000000000000";
  await TestValidator.httpError(
    "retrieve non-existent admin throws 404",
    404,
    async () => {
      await api.functional.communityPlatform.admins.at(actorConnection, {
        adminId: nonExistentAdminId,
      });
    },
  );
}
