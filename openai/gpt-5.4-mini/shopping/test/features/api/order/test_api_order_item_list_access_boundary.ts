import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Verifies safe failure behavior when an administrator requests order items for an inaccessible order.
 *
 * This test authenticates an administrator, then exercises the order-scoped item listing endpoint with a deliberately non-existent order identifier to confirm the platform does not leak unrelated order-item data. It validates that the endpoint fails safely with either a not-found or forbidden response according to access policy.
 *
 * The scenario focuses on path-scoped access boundaries only. It ensures the provided orderId is the sole order scope considered by the endpoint and that no item details from other orders are exposed on error.
 *
 * 1. Authenticate an administrator through the join utility.
 * 2. Call the protected order-item listing endpoint with a random, inaccessible orderId.
 * 3. Validate that the request fails with a safe not-found or forbidden error.
 */
export async function test_api_order_item_list_access_boundary(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(12),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const inaccessibleOrderId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "administrator order-item list should reject inaccessible order scope",
    [403, 404],
    async () =>
      await api.functional.mallPlatform.administrator.orders.orderItems.index(
        adminConnection,
        {
          orderId: inaccessibleOrderId,
          body: {} satisfies IMallPlatformOrderItem.IRequest,
        },
      ),
  );
}
