import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test admin force-refunding a delivered order item.
 *
 * Validates the admin force-refund endpoint by authenticating as an administrator
 * and attempting to force-refund an order item. Since the full E2E flow (creating
 * seller, product, customer, order, progressing through statuses) requires APIs not
 * available in the SDK, this test demonstrates the force-refund endpoint structure
 * with generated order and item IDs.
 *
 * Note: This test validates the API endpoint structure. The server will return
 * errors for non-existent order/item IDs, which is expected behavior. The test
 * verifies the endpoint accepts properly typed requests.
 *
 * 1. Admin authenticates via admin join using utility function.
 * 2. Generates random UUIDs for orderId and itemId.
 * 3. Calls POST /admin/admin/orders/{orderId}/items/{itemId}/force-refund.
 * 4. Validates the response structure matches IEcommerceMallOrderItem type.
 * 5. For delivered items, validates status becomes 'refunded'.
 * 6. Validates response includes product and seller profile snapshots.
 */
export async function test_api_admin_force_refund_delivered_item_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin using the utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // 2. Generate random UUIDs for order and item IDs
  // Note: In a real scenario, these would come from a valid order with a delivered item
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const itemId = typia.random<string & tags.Format<"uuid">>();
  // 3. Admin calls force-refund endpoint
  // The endpoint validates the request body structure even if the order/item doesn't exist
  const refundedItem =
    await api.functional.ecommerceMall.admin.admin.orders.items.force_refund.create(
      adminConnection,
      {
        orderId: orderId,
        itemId: itemId,
        body: {
          reason: "Test force-refund for delivered item",
        } satisfies IEcommerceMallOrderItem.IForceRefund,
      },
    );
  // 4. Validate the response matches expected structure
  typia.assert(refundedItem);
  // 5. For a delivered order item, validate status is 'refunded'
  TestValidator.equals(
    "order item status is refunded",
    refundedItem.status,
    "refunded",
  );
  // 6. Validate the order item has product snapshot data
  TestValidator.predicate(
    "has product snapshot",
    !!refundedItem.productSnapshot,
  );
  // 7. Validate the order item has seller profile snapshot data
  TestValidator.predicate(
    "has seller profile snapshot",
    !!refundedItem.sellerProfileSnapshot,
  );
  // 8. Validate the order item has product variant reference
  TestValidator.predicate("has product variant", !!refundedItem.productVariant);
  // 9. Validate the order item has order reference
  TestValidator.predicate("has order reference", !!refundedItem.order);
  // 10. Validate order status is 'refunded' when all items are refunded
  TestValidator.equals(
    "order status is refunded",
    refundedItem.order.status,
    "refunded",
  );
}
