import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCancellationRequest";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_mall_platform_customer_order_items_cancellation_requests_patch_by_orderitemid } from "../../../generate/generate_random_mall_platform_customer_order_items_cancellation_requests_patch_by_orderitemid";
import { prepare_random_mall_platform_cancellation_request } from "../../../prepare/prepare_random_mall_platform_cancellation_request";

/**
 * Prevent duplicate active cancellation requests for the same order item.
 *
 * Verifies the customer cancellation workflow for a paid, unshipped order item and confirms that a second submission for the same item does not create a competing active request.
 *
 * 1. Register and authenticate a customer account with a unique email.
 * 2. Load an existing customer order and select one paid order item that has no active cancellation request yet.
 * 3. Submit the first cancellation request and verify it starts in the pending state with the original reason preserved.
 * 4. Attempt to submit a duplicate cancellation request for the same order item.
 * 5. Confirm the duplicate attempt is rejected and the original request data remains unchanged.
 */
export async function test_api_cancellation_request_prevent_duplicate_active_request(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const join = await authorize_customer_join(customerConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@example.com` satisfies string &
        tags.Format<"email">,
      password: RandomGenerator.alphaNumeric(12),
      href: "https://example.com/signup",
      referrer: "https://example.com/",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(join);
  const order = await api.functional.mallPlatform.customer.orders.at(
    customerConnection,
    {
      orderId: join.profile?.customer.id ?? join.id,
    },
  );
  typia.assert(order);
  const paidItem = order.orderItems.find((item) => item.status === "paid");
  if (paidItem === undefined)
    throw new Error(
      "No paid order item found for cancellation request testing.",
    );
  const firstReason = RandomGenerator.paragraph({ sentences: 2 });
  const firstRequest =
    await generate_random_mall_platform_customer_order_items_cancellation_requests_patch_by_orderitemid(
      customerConnection,
      {
        params: {
          orderItemId: paidItem.id,
        },
        body: {
          reason: firstReason,
        } satisfies IMallPlatformCancellationRequest.ICreate,
      },
    );
  typia.assert(firstRequest);
  TestValidator.equals(
    "first cancellation request targets the selected order item",
    firstRequest.orderItem.id,
    paidItem.id,
  );
  TestValidator.equals(
    "first cancellation request reason is preserved",
    firstRequest.reason,
    firstReason,
  );
  TestValidator.equals(
    "first cancellation request starts pending review",
    firstRequest.status,
    "pending",
  );
  TestValidator.equals(
    "first cancellation request has no reviewer",
    firstRequest.reviewer,
    null,
  );
  TestValidator.equals(
    "first cancellation request has no review result",
    firstRequest.reviewResult,
    null,
  );
  TestValidator.equals(
    "first cancellation request has no reviewer note",
    firstRequest.reviewerNote,
    null,
  );
  TestValidator.equals(
    "first cancellation request has no reviewed timestamp",
    firstRequest.reviewedAt,
    null,
  );
  const duplicateReason = RandomGenerator.paragraph({ sentences: 3 });
  await TestValidator.error(
    "duplicate cancellation request should be rejected",
    async () => {
      await generate_random_mall_platform_customer_order_items_cancellation_requests_patch_by_orderitemid(
        customerConnection,
        {
          params: {
            orderItemId: paidItem.id,
          },
          body: {
            reason: duplicateReason,
          } satisfies IMallPlatformCancellationRequest.ICreate,
        },
      );
    },
  );
  const reloadedOrder = await api.functional.mallPlatform.customer.orders.at(
    customerConnection,
    {
      orderId: order.id,
    },
  );
  typia.assert(reloadedOrder);
  const reloadedItem = reloadedOrder.orderItems.find(
    (item) => item.id === paidItem.id,
  );
  if (reloadedItem === undefined)
    throw new Error("Reloaded order item could not be found.");
  TestValidator.equals(
    "order item remains the same paid item",
    reloadedItem.id,
    paidItem.id,
  );
  TestValidator.equals(
    "order item status is unchanged after duplicate attempt",
    reloadedItem.status,
    paidItem.status,
  );
  TestValidator.equals(
    "original cancellation request reason remains unchanged",
    firstRequest.reason,
    firstReason,
  );
  TestValidator.equals(
    "original cancellation request review state remains pending",
    firstRequest.status,
    "pending",
  );
  TestValidator.equals(
    "original cancellation request reviewer remains unset",
    firstRequest.reviewer,
    null,
  );
  TestValidator.equals(
    "original cancellation request review result remains unset",
    firstRequest.reviewResult,
    null,
  );
  TestValidator.equals(
    "original cancellation request reviewer note remains unset",
    firstRequest.reviewerNote,
    null,
  );
  TestValidator.equals(
    "original cancellation request reviewed timestamp remains unset",
    firstRequest.reviewedAt,
    null,
  );
}
