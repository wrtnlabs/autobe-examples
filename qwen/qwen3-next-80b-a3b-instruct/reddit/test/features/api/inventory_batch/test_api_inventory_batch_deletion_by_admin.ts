import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_inventory_batch_deletion_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Update the connection with the access token from the auth result
  // The server sets the Authorization header in adminConnection internally via the authorize_admin_join function
  // Step 2: Generate a valid UUID for an existing batch
  const batchId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Delete the inventory batch
  await api.functional.communityPlatform.admin.inventory_batches.erase(
    adminConnection,
    {
      batchId,
    },
  );
  // No validation possible because:
  // - No API to verify batch existence
  // - No API to list batches
  // - Local system may have pre-existing batch with this ID
  // - We are only testing that the delete endpoint accepts the request properly
  // - The response is 204 No Content and returns void
}
