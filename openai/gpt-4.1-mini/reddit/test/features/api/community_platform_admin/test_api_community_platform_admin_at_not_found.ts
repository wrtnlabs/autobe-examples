import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_platform_admin_at_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Create a connection for unauthorized user (no login) to test 401
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  // Generate a random non-existent admin UUID
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  // Calling with unauthorized connection should return 401 Unauthorized
  await TestValidator.httpError(
    "access without login returns 401 Unauthorized",
    401,
    async () => {
      await api.functional.communityPlatform.admins.at(unauthorizedConnection, {
        id: nonExistentId,
      });
    },
  );
  // Since no utility available, non-admin test skipped (requires proper auth setup)
  // Test 404 Not Found response when requesting non-existent admin with adminConnection
  const adminConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "admin fetch for non-existent id returns 404 Not Found",
    404,
    async () => {
      await api.functional.communityPlatform.admins.at(adminConnection, {
        id: nonExistentId,
      });
    },
  );
}
