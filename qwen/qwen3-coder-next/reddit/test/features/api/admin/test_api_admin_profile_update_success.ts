import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_admin_profile_update_success(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection using base connection
  const adminConnection: api.IConnection = {
    host: connection.host,
  };
  // Update admin profile with empty request body
  // IRedditPlatformAdmin.IRequest is defined as an empty object type
  const result = await api.functional.redditPlatform.admins.updateAdmin(
    adminConnection,
    {
      body: {
        // No fields to update - empty body as per type definition
      } satisfies IRedditPlatformAdmin.IRequest,
    },
  );
  // Validate the response matches the expected admin structure
  typia.assert(result);
}
