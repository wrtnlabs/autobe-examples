import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItemSnapshot";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformOrderItemSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_order_item_snapshot_history_empty_result(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verifies that an administrator can query an order item's snapshot history and receive an empty paginated result when no snapshots exist.
   *
   * This scenario validates the snapshot history endpoint for a known order-item pair with no recorded snapshots. It ensures the response remains a proper paginated page and returns an empty data array rather than fabricating historical entries from the current order item state.
   *
   * 1. Authenticate as an administrator using a dedicated connection.
   * 2. Query the order-item snapshot history with a valid orderId, orderItemId, and empty-history request criteria.
   * 3. Validate that the result is a paginated page with no records and no snapshot entries.
   */
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com` satisfies string &
        tags.Format<"email">,
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const response =
    await api.functional.mallPlatform.administrator.orders.orderItems.snapshots.index(
      adminConnection,
      {
        orderId,
        orderItemId,
        body: {
          page: 1,
          limit: 10,
        } satisfies IMallPlatformOrderItemSnapshot.IRequest,
      },
    );
  typia.assert(response);
  TestValidator.equals("empty snapshot page data", response.data, []);
  TestValidator.equals(
    "empty snapshot page records",
    response.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty snapshot page pages",
    response.pagination.pages,
    0,
  );
}
