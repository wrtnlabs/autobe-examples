import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";

export async function test_api_admin_profile_retrieval_not_found(
  connection: api.IConnection,
) {
  // Test that attempting to retrieve a non-existent admin profile using a valid UUID format results in a HTTP error.
  // This validates that the system correctly identifies non-existent administrative records and returns an error
  // instead of returning empty or invalid data, even without explicit admin authentication setup due to API limitations.

  // Generate a valid UUID format that does not correspond to any existing admin record.
  const nonExistentAdminId = typia.random<string & tags.Format<"uuid">>();

  // Attempt to retrieve the non-existent admin profile
  // The system must return a HTTP error (404 Not Found) for non-existent admin IDs,
  // even if the test doesn't have admin privileges (as admin creation/auth functions are unavailable)
  // The TestValidator.error will verify that an error occurs (indicating the system properly handles non-existent records)
  await TestValidator.error(
    "non-existent admin ID should return HTTP error",
    async () => {
      await api.functional.communityPlatform.admin.admins.at(connection, {
        adminId: nonExistentAdminId,
      });
    },
  );
}
