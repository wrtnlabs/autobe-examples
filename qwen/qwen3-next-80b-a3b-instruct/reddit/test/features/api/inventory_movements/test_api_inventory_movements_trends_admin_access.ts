import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformInventoryMovements } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformInventoryMovements";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformInventoryMovements } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformInventoryMovements";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_inventory_movements_trends_admin_access(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin-specific connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/join",
      referrer: "https://example.com",
      ip: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(authResult);
  // Step 2: Generate request body for inventory movement trends
  const request: ICommunityPlatformInventoryMovements.IRequest = {
    movement_type: RandomGenerator.pick([
      "receipt",
      "shipment",
      "adjustment",
      "transfer",
    ] as const),
    inventory_item_id: typia.random<string & tags.Format<"uuid">>(),
    source_warehouse_id: typia.random<string & tags.Format<"uuid">>(),
    destination_warehouse_id: typia.random<string & tags.Format<"uuid">>(),
    order_id: typia.random<string & tags.Format<"uuid">>(),
    status: RandomGenerator.pick([
      "active",
      "completed",
      "failed",
      "cancelled",
    ] as const),
    page: 1,
    limit: 25,
    sort_by: "created_at",
    sort_direction: "desc",
  };
  // Step 3: Call the inventory movement trends API endpoint
  const result: IPageICommunityPlatformInventoryMovements =
    await api.functional.communityPlatform.admin.inventory.movements.trends.index(
      adminConnection,
      {
        body: request satisfies ICommunityPlatformInventoryMovements.IRequest,
      },
    );
  typia.assert(result);
  // Step 4: Validate pagination metadata
  TestValidator.equals("pagination current page", result.pagination.current, 1);
  TestValidator.equals("pagination limit", result.pagination.limit, 25);
  TestValidator.predicate(
    "pagination records greater than 0",
    result.pagination.records > 0,
  );
  TestValidator.predicate(
    "pagination pages greater than 0",
    result.pagination.pages > 0,
  );
  // Step 5: Validate data array structure
  TestValidator.predicate("data array exists", Array.isArray(result.data));
  TestValidator.predicate("data array not empty", result.data.length > 0);
  // Step 6: Validate each data item is an inventory movement trend object
  result.data.forEach((item) => {
    TestValidator.predicate(
      "item ratio is number",
      typeof item.ratio === "number",
    );
    TestValidator.predicate("item ratio is positive", item.ratio > 0);
  });
}
