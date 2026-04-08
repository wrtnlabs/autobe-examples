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
import type { IMallPlatformRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformRefundRequest";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Rejects administrator refund-request updates when the order-item route scope
 * does not match the refund request.
 *
 * This test validates the route-level ownership rule for administrator refund
 * request updates. It authenticates an administrator, then submits a
 * type-correct update against a deliberately mismatched orderItemId and
 * refundRequestId pair so the backend must refuse to resolve the request within
 * the specified order-item scope.
 *
 * The scenario focuses on scope enforcement rather than workflow transitions.
 * It checks that the call fails through the authenticated administrator path
 * and that the endpoint does not accept a refund request that belongs to a
 * different order item.
 *
 * 1. Authenticate as an administrator using a fresh actor-specific connection.
 * 2. Call the administrator refund-request update endpoint with mismatched
 *    order item and refund request identifiers.
 * 3. Verify that the request is rejected as an HTTP error.
 */
export async function test_api_refund_request_admin_update_order_item_scope_mismatch(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const refundRequestId = typia.random<string & tags.Format<"uuid">>();
  const body = {
    reason: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IMallPlatformRefundRequest.IUpdate;
  await TestValidator.error(
    "administrator refund request update should fail for mismatched order item scope",
    async () => {
      await api.functional.mallPlatform.administrator.orderItems.refundRequests.update(
        adminConnection,
        {
          orderItemId,
          refundRequestId,
          body,
        },
      );
    },
  );
}
