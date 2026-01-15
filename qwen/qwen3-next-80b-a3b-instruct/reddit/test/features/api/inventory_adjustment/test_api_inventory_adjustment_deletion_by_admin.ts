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
export async function test_api_inventory_adjustment_deletion_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    href: "https://example.com/join",
    referrer: "https://example.com",
  } satisfies ICommunityPlatformAdmin.IJoin;
  const admin = await authorize_admin_join(adminConnection, {
    body: adminData,
  });
  typia.assert(admin);
  // Step 2: Generate a valid UUID for adjustmentId
  // Note: The system does not provide a way to create inventory adjustments
  // Therefore, we cannot create a real adjustment record to delete
  // However, the deletion endpoint accepts valid UUID format
  // We'll generate a valid UUID to simulate a real deletion scenario
  const adjustmentId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Delete the inventory adjustment as admin
  // This verifies the admin can perform deletion operations
  // The server should accept a valid UUID format in the request
  await api.functional.communityPlatform.admin.inventory_adjustments.erase(
    adminConnection,
    {
      adjustmentId,
    },
  );
  // Step 4: Validation
  // Since there is no endpoint to verify the adjustment exists or not after deletion,
  // the only validation possible is that no error was thrown during deletion
  // A successful void return from the erase operation is our only verification
}
