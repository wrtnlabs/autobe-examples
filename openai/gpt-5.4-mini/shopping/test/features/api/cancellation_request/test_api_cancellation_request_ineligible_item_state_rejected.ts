import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCancellationRequest";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
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

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_mall_platform_administrator_order_items_cancellation_requests_create } from "../../../generate/generate_random_mall_platform_administrator_order_items_cancellation_requests_create";
import { prepare_random_mall_platform_cancellation_request } from "../../../prepare/prepare_random_mall_platform_cancellation_request";

/**
 * Verifies that cancellation request submission is rejected for an order item
 * that is no longer eligible for cancellation.
 *
 * This test authenticates a customer and an administrator with isolated
 * connections, loads a customer order detail, and selects an order item that is
 * already beyond the paid-and-unshipped state. It then attempts to create a
 * cancellation request for that ineligible item and verifies that the API
 * rejects the request without mutating the order detail view.
 *
 * The scenario focuses on state-based access control and guards against
 * accidental side effects such as status transitions, shipment changes, or the
 * creation of a new cancellation request record when the target item is already
 * shipped or otherwise ineligible.
 *
 * 1. Register and authenticate a customer and an administrator using isolated
 *    connections.
 * 2. Load a customer order detail and identify an order item that is not in the
 *    cancellable paid state.
 * 3. Capture the order detail before the rejection attempt for later
 *    comparison.
 * 4. Attempt to create a cancellation request for the ineligible order item.
 * 5. Verify the request is rejected and the order detail remains unchanged.
 */
export async function test_api_cancellation_request_ineligible_item_state_rejected(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const administratorConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const administratorEmail = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.Format<"password">>();
  await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password,
      href: "https://example.com/register/customer",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: administratorEmail,
      password,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const order = await api.functional.mallPlatform.customer.orders.at(
    customerConnection,
    {
      orderId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(order);
  const ineligibleItem = order.orderItems.find(
    (item) => item.status !== "paid",
  );
  TestValidator.predicate(
    "order contains at least one ineligible item state",
    ineligibleItem !== undefined,
  );
  if (ineligibleItem === undefined) return;
  const beforeOrder = typia.assert<IMallPlatformOrder>(order);
  await TestValidator.error(
    "cancellation request should be rejected for ineligible item state",
    async () => {
      await api.functional.mallPlatform.administrator.orderItems.cancellationRequests.create(
        administratorConnection,
        {
          orderItemId: ineligibleItem.id,
          body: {
            reason: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IMallPlatformCancellationRequest.ICreate,
        },
      );
    },
  );
  const afterOrder = await api.functional.mallPlatform.customer.orders.at(
    customerConnection,
    {
      orderId: order.id,
    },
  );
  typia.assert(afterOrder);
  TestValidator.equals(
    "order detail should remain unchanged after rejected cancellation attempt",
    afterOrder,
    beforeOrder,
    (key) => key === "updatedAt",
  );
}
