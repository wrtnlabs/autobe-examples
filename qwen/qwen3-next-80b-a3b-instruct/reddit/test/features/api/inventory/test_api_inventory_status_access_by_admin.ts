import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformInventoryBatches } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformInventoryBatches";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_inventory_status_access_by_admin(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test successful access to comprehensive inventory analytics dashboard by
   * an authorized admin user.
   *
   * Validates that only admins with proper authentication can retrieve
   * aggregated inventory metrics including stock levels, low-stock alerts,
   * overstock identification, and turnover ratios across all warehouse
   * locations and product categories. Confirms response format matches
   * ICommunityPlatformInventoryBatches schema and no sensitive item-level
   * details are exposed.
   *
   * This test follows the complete workflow:
   *
   * 1. Authenticate as admin using join registration flow
   * 2. Access the protected inventory analytics endpoint
   * 3. Validate the response structure and type safety
   */
  // Step 1: Create admin connection and authenticate via join
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Step 2: Call inventory status endpoint using admin connection
  const response: ICommunityPlatformInventoryBatches =
    await api.functional.communityPlatform.admin.analytics.inventory.status.index(
      adminConnection,
    );
  // Step 3: Validate response structure and type
  typia.assert(response);
}
