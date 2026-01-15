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
export async function test_api_inventory_lifecycle_deletion_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection for the admin
  const adminConnection: api.IConnection = { host: connection.host };
  // Step 2: Authenticate as admin using the authorized_join utility function
  // This establishes admin privileges necessary for deletion
  const authResult = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/admin/join",
      referrer: "https://example.com",
      ip: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(authResult);
  // Step 3: Generate a random UUID for the inventory lifecycle to be deleted
  // Note: In a complete system, we would create a lifecycle first,
  // but the API does not provide a creation endpoint.
  // Therefore, we must use a valid UUID format for deletion.
  const lifecycleId = typia.random<string & tags.Format<"uuid">>();
  // Step 4: Perform the deletion operation using the adminConnection (NOT base connection)
  await api.functional.communityPlatform.admin.inventory_lifecycle.erase(
    adminConnection,
    {
      lifecycleId: lifecycleId,
    },
  );
}
