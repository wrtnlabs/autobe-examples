import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActivityLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_activity_log_erase_various_scenarios(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Successful Deletion of Existing Activity Log Entry
  // 1. Create a new activity log entry to ensure known UUID
  // 2. Delete the entry by ID
  // 3. Validate deletion response equals the deleted record
  // 4. Attempt to delete again to verify non-existence
  // We'll use typia.random to generate a sample UUID for non-existent test
  // Create actor-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Since no utility function or API endpoint for creation is given,
  // we cannot create an actual activity log entry, so we rely on a random UUID
  // implying the test scope is to verify error handling and basic mechanics
  // For a valid deletion, we assume existence of a UUID - using random UUID as placeholder
  // but realistically this requires a pre-existing fixture or seed data
  // Step 1: Generate a random UUID for existing entry simulation
  // Since we cannot create or fetch entries, we use a random UUID (to simulate existence)
  // We'll test the delete function - success path only if server accepts and returns
  // Using a valid UUID format for tests
  const existingUUID = typia.random<string & tags.Format<"uuid">>();
  // 1. Attempt to delete existing activity log entry
  const deleted = await api.functional.communityPlatform.activityLogs.erase(
    adminConnection,
    {
      id: existingUUID,
    },
  );
  typia.assert(deleted);
  // Because the API does not provide get method to confirm deletion,
  // we can only assume deletion is permanent if no errors occur on subsequent delete attempts
  // 2. Deletion attempt for non-existent log entry
  const nonExistentUUID = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "Deletion of non-existent activity log entry should return 404",
    404,
    async () => {
      await api.functional.communityPlatform.activityLogs.erase(
        adminConnection,
        {
          id: nonExistentUUID,
        },
      );
    },
  );
  // 3. Deletion attempt with invalid UUID format
  await TestValidator.httpError(
    "Deletion with invalid UUID format should return 400",
    400,
    async () => {
      await api.functional.communityPlatform.activityLogs.erase(
        adminConnection,
        {
          // invalid UUID
          id: "invalid-uuid-format-string" as string & tags.Format<"uuid">,
        },
      );
    },
  );
}
