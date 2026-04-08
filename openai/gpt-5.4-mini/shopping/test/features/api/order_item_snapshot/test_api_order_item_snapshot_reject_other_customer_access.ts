import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItemSnapshot";
import type { IMallPlatformOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItemSnapshotVariantOption";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_order_item_snapshot_reject_other_customer_access(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Rejects foreign snapshot access for a customer attempting to read another customer's order item snapshot.
   *
   * This test authenticates a customer session, then requests a guessed order, order item, and snapshot identifier triple through the protected snapshot detail endpoint. It validates that the platform enforces ownership across the entire hierarchy and returns a not-found or equivalent access-denied response without exposing whether the snapshot exists.
   *
   * 1. Authenticate a customer session using the join utility on an isolated connection.
   * 2. Attempt to retrieve an order item snapshot using foreign-looking guessed identifiers.
   * 3. Assert that the request fails with a not-found or forbidden-style HTTP error.
   */
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: "https://example.com/register",
      referrer: "https://example.com/",
      ip: "127.0.0.1",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(customer);
  const foreignOrderId = typia.random<string & tags.Format<"uuid">>();
  const foreignOrderItemId = typia.random<string & tags.Format<"uuid">>();
  const foreignSnapshotId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "foreign order item snapshot access should be rejected",
    [401, 403, 404],
    async () => {
      await api.functional.mallPlatform.customer.orders.orderItems.snapshots.at(
        customerConnection,
        {
          orderId: foreignOrderId,
          orderItemId: foreignOrderItemId,
          snapshotId: foreignSnapshotId,
        },
      );
    },
  );
}
