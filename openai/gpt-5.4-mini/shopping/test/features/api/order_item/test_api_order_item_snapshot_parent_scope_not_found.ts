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
 * Verify that an order item snapshot cannot be resolved under the wrong parent order item.
 *
 * This test validates the historical integrity of the order-item snapshot lookup path by ensuring the endpoint rejects a mismatched parent-child combination. It focuses on the contract that a snapshot is only visible when the supplied orderItemId matches the snapshot's actual parent scope.
 *
 * 1. Create a dedicated customer-authenticated connection.
 * 2. Attempt to retrieve a snapshot using deliberately mismatched order-item and snapshot identifiers.
 * 3. Confirm the endpoint reports not found for the invalid parent scope pairing.
 */
export async function test_api_order_item_snapshot_parent_scope_not_found(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      href: "https://example.com/join",
      referrer: "https://example.com",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(authorized);
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const orderItemSnapshotId = typia.random<string & tags.Format<"uuid">>();
  const mismatchedOrderItemId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "mismatched order item snapshot lookup should return not found",
    [404],
    async () => {
      await api.functional.mallPlatform.customer.orderItems.snapshots.at(
        customerConnection,
        {
          orderItemId:
            mismatchedOrderItemId === orderItemId
              ? typia.random<string & tags.Format<"uuid">>()
              : mismatchedOrderItemId,
          orderItemSnapshotId,
        },
      );
    },
  );
}
