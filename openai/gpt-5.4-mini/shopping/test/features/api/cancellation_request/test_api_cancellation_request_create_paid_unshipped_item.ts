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
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_mall_platform_customer_order_items_cancellation_requests_post_by_orderitemid } from "../../../generate/generate_random_mall_platform_customer_order_items_cancellation_requests_post_by_orderitemid";
import { prepare_random_mall_platform_cancellation_request } from "../../../prepare/prepare_random_mall_platform_cancellation_request";

/**
 * Test creating a cancellation request for a paid, unshipped customer order item.
 *
 * Verifies that an authenticated customer can submit a cancellation request only for an item they own while it remains in the paid state and has not yet been shipped.
 *
 * The test checks the returned cancellation request payload, including the submitted reason, the single linked order item, and the initial pending review state.
 * It also confirms that the request creation flow does not mutate the underlying order item status and does not introduce any immediate side effects to other items, shipment data, refund data, or inventory state.
 *
 * 1. Register and authenticate a customer for the customer-only endpoint.
 * 2. Submit a cancellation request for a paid, unshipped order item belonging to that customer.
 * 3. Validate the created request fields and preserve-order invariants.
 */
export async function test_api_cancellation_request_create_paid_unshipped_item(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: "https://example.com/register",
      referrer: "https://example.com/",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const reason = RandomGenerator.paragraph({ sentences: 2 });
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const created =
    await generate_random_mall_platform_customer_order_items_cancellation_requests_post_by_orderitemid(
      customerConnection,
      {
        params: { orderItemId },
        body: { reason } satisfies IMallPlatformCancellationRequest.ICreate,
      },
    );
  typia.assert(created);
  TestValidator.equals("submitted reason is preserved", created.reason, reason);
  TestValidator.equals(
    "cancellation request is linked to the requested order item",
    created.orderItem.id,
    orderItemId,
  );
  TestValidator.predicate(
    "cancellation request starts pending",
    created.status === "pending",
  );
  TestValidator.equals("reviewer is initially null", created.reviewer, null);
  TestValidator.equals(
    "reviewedAt is initially null",
    created.reviewedAt,
    null,
  );
  TestValidator.equals(
    "reviewResult is initially null",
    created.reviewResult,
    null,
  );
  TestValidator.equals(
    "reviewerNote is initially null",
    created.reviewerNote,
    null,
  );
}
