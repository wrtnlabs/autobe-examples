import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_reddit_platform_admin_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Test retrieving a specific administrator account by ID
  // Scenario 1: Retrieve admin with valid ID (using simulation mode with random UUID)
  const validAdminId = typia.random<string & tags.Format<"uuid">>();
  const admin = await api.functional.redditPlatform.admins.at(connection, {
    adminId: validAdminId,
  });
  // Validate response structure - IRedditPlatformAdmin is currently an empty object type
  typia.assert(admin);
  // Scenario 2: Retrieve non-existent admin ID
  const nonExistentAdminId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should return error for non-existent admin ID",
    async () => {
      await api.functional.redditPlatform.admins.at(connection, {
        adminId: nonExistentAdminId,
      });
    },
  );
}
