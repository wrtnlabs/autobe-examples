import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_admin_profile_update_empty(
  connection: api.IConnection,
): Promise<void> {
  // Create a connection for admin operations
  const adminConnection: api.IConnection = {
    host: connection.host,
    headers: {
      authorization: "Bearer test-admin-token",
    },
  };
  // Update admin profile with empty request body
  const updatedAdmin = await api.functional.redditPlatform.admins.updateAdmin(
    adminConnection,
    {
      body: {},
    },
  );
  typia.assert(updatedAdmin);
}
