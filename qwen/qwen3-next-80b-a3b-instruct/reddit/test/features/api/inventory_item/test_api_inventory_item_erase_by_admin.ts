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
export async function test_api_inventory_item_erase_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    href: "https://example.com/join",
    referrer: "https://example.com",
  } satisfies ICommunityPlatformAdmin.IJoin;
  await authorize_admin_join(adminConnection, { body: adminData });
  // Step 2: Generate a valid UUID for an inventory item (assuming it exists on server)
  // Note: We cannot create inventory items with provided functions, so use random UUID
  const itemId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Verify admin can delete inventory item (assuming item exists)
  await api.functional.communityPlatform.admin.inventory_items.erase(
    adminConnection,
    { itemId },
  );
  // No validation of deletion since we have no way to verify item existence or deletion
  // The erase function returns void, and no getter function is provided to verify deletion
  // We cannot test non-admin deletion because we cannot create non-admin users with provided utilities
}
