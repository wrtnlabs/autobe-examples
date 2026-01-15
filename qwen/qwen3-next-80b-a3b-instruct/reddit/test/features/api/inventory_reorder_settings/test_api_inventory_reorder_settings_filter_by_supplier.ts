import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformInventoryReorderSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformInventoryReorderSettings";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformInventoryReorderSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformInventoryReorderSettings";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_inventory_reorder_settings_filter_by_supplier(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
      ip: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Step 2: Generate a random supplier ID for filtering
  const supplierId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Generate a minimum reorder quantity threshold (e.g., 10)
  const minReorderQuantity = 10;
  // Step 4: Construct the request body with supplier_id and minimum_reorder_quantity filters
  const requestBody = {
    page: 1,
    limit: 25,
    supplier_id: supplierId,
    minimum_reorder_quantity: minReorderQuantity,
  } satisfies ICommunityPlatformInventoryReorderSettings.IRequest;
  // Step 5: Call the inventory reorder settings API with the admin connection
  const result =
    await api.functional.communityPlatform.admin.inventory_reorder_settings.index(
      adminConnection, // ✅ Use adminConnection (NOT base connection!)
      { body: requestBody },
    );
  typia.assert(result);
  // Step 6: Validate that pagination structure is correct
  TestValidator.equals("pagination current page", result.pagination.current, 1);
  TestValidator.equals("pagination limit", result.pagination.limit, 25);
  TestValidator.predicate(
    "pagination records count non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    result.pagination.pages >= 0,
  );
  // Step 7: Verify that at least one setting was returned to confirm filtering worked
  TestValidator.predicate(
    "at least one setting returned",
    result.data.length > 0,
  );
}
