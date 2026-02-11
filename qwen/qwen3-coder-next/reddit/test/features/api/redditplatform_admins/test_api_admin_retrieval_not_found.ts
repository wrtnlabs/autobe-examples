import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_admin_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Create admin-specific connection for the test
  const adminConnection: api.IConnection = { host: connection.host };
  // Generate a valid UUID format that does not correspond to any existing admin
  const nonExistentAdminId = "00000000-0000-0000-0000-000000000000";
  // Attempt to retrieve non-existent admin - should return 404 error
  await TestValidator.error(
    "should throw 404 for non-existent admin",
    async () => {
      await api.functional.redditPlatform.admins.at(adminConnection, {
        adminId: nonExistentAdminId,
      });
    },
  );
}
