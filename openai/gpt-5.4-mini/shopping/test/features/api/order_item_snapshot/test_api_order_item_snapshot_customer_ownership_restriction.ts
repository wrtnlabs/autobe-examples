import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItemSnapshot";
import type { IMallPlatformOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItemSnapshotVariantOption";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipment";
import type { IMallPlatformShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipmentItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Verify that order item snapshots remain restricted to the owning customer.
 *
 * This test checks the preserved purchase-history access rule for immutable
 * order item snapshots. It loads a real order from the owning customer, extracts
 * an actual order item and snapshot identifier from that historical record, and
 * then confirms that a different customer cannot access the same snapshot.
 *
 * 1. Register two isolated customer sessions.
 * 2. Load the owning customer's preserved order history and locate an item snapshot.
 * 3. Attempt to read the same snapshot as a different customer.
 * 4. Confirm the cross-account request is rejected without disclosing history.
 */
export async function test_api_order_item_snapshot_customer_ownership_restriction(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_customer_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: "https://example.com/signup",
      referrer: "https://example.com",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(owner);
  const guestConnection: api.IConnection = { host: connection.host };
  const guest = await authorize_customer_join(guestConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: "https://example.com/signup",
      referrer: "https://example.com",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(guest);
  const order = await api.functional.mallPlatform.customer.orders.at(
    ownerConnection,
    {
      orderId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(order);
  TestValidator.predicate(
    "owner order must contain at least one order item",
    order.orderItems.length > 0,
  );
  const orderItem = order.orderItems.find(
    (item): item is IMallPlatformOrderItem =>
      item !== null && item !== undefined,
  );
  if (orderItem === undefined)
    throw new Error("No order item found in owner order history.");
  const snapshot =
    await api.functional.mallPlatform.customer.orderItems.snapshots.at(
      ownerConnection,
      {
        orderItemId: orderItem.id,
        orderItemSnapshotId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(snapshot);
  await TestValidator.error(
    "cross-account access must be rejected",
    async () => {
      await api.functional.mallPlatform.customer.orderItems.snapshots.at(
        guestConnection,
        {
          orderItemId: orderItem.id,
          orderItemSnapshotId: snapshot.id,
        },
      );
    },
  );
}
