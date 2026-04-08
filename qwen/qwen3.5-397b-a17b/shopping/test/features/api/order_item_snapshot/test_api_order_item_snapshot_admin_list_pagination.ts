import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItemSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator retrieval of order item snapshots with pagination.
 *
 * Validates the complete workflow for administrators to browse order item snapshots across the entire platform. Ensures that the pagination system works correctly with default parameters and that all snapshot data is properly structured and accessible.
 *
 * Special attention is given to verifying that the response structure matches IPageIShoppingMallOrderItemSnapshot.ISummary schema, pagination metadata is accurate, and each snapshot contains the required historical purchase data including product name, variant price, and seller information.
 *
 * 1. Administrator authenticates via authorize_admin_join utility function.
 * 2. Calls PATCH /shoppingMall/admin/admin/order-item-snapshots with default pagination.
 * 3. Validates response structure and pagination metadata.
 * 4. Verifies each snapshot contains all required fields.
 * 5. Confirms admin can view all platform-wide snapshots.
 */
export async function test_api_order_item_snapshot_admin_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: RandomGenerator.pick(["regular", "super"] as const),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Retrieve order item snapshots with default pagination
  const response =
    await api.functional.shoppingMall.admin.admin.order_item_snapshots.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 20,
          sort: "created_at",
          direction: "desc",
        } satisfies IShoppingMallOrderItemSnapshot.IRequest,
      },
    );
  typia.assert(response);
  // 3. Validate pagination metadata business logic
  TestValidator.predicate(
    "records count is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    response.pagination.pages >= 0,
  );
  // 4. Validate pages calculation formula
  const expectedPages =
    response.pagination.records === 0
      ? 0
      : Math.ceil(response.pagination.records / response.pagination.limit);
  TestValidator.equals(
    "pages calculation",
    response.pagination.pages,
    expectedPages,
  );
  // 5. Validate data array structure
  TestValidator.predicate("data is an array", Array.isArray(response.data));
  // 6. Verify sorting by created_at descending (business logic)
  if (response.data.length > 1) {
    for (let i = 0; i < response.data.length - 1; i++) {
      const current = new Date(response.data[i].created_at).getTime();
      const next = new Date(response.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        `snapshot ${i} created_at >= snapshot ${i + 1} created_at`,
        current >= next,
      );
    }
  }
  // 7. Validate data length matches pagination constraint
  TestValidator.predicate(
    "data length does not exceed limit",
    response.data.length <= response.pagination.limit,
  );
}
