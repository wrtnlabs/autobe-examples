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
 * Create a cancellation request for a paid order item that has not been shipped.
 *
 * Validates the customer-facing cancellation-request workflow by registering a fresh customer, submitting a cancellation request for a specific order item, and checking the created request's initial state.
 *
 * 1. Registers and authenticates a customer using the dedicated join utility.
 * 2. Submits a cancellation request with a valid reason for a target order item.
 * 3. Verifies the returned request preserves the submitted reason and starts in pending state.
 * 4. Confirms the linked order item reference is returned and the review metadata remains unset.
 */
export async function test_api_cancellation_request_create_paid_unshipped_item(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: null,
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(customer);
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const reason = RandomGenerator.paragraph({ sentences: 2 });
  const cancellationRequest =
    await generate_random_mall_platform_customer_order_items_cancellation_requests_post_by_orderitemid(
      customerConnection,
      {
        params: { orderItemId },
        body: { reason } satisfies IMallPlatformCancellationRequest.ICreate,
      },
    );
  typia.assert(cancellationRequest);
  TestValidator.equals(
    "cancellation request reason should match the submitted reason",
    cancellationRequest.reason,
    reason,
  );
  TestValidator.equals(
    "cancellation request should target the requested order item",
    cancellationRequest.orderItem.id,
    orderItemId,
  );
  TestValidator.equals(
    "cancellation request should start pending",
    cancellationRequest.status,
    "pending",
  );
  TestValidator.equals(
    "cancellation request should not be reviewed yet",
    cancellationRequest.reviewedAt,
    null,
  );
  TestValidator.equals(
    "cancellation request should not have a review result yet",
    cancellationRequest.reviewResult,
    null,
  );
  TestValidator.equals(
    "cancellation request should not have a reviewer note yet",
    cancellationRequest.reviewerNote,
    null,
  );
  TestValidator.equals(
    "linked order item should remain paid while the request is pending",
    cancellationRequest.orderItem.status,
    "paid",
  );
  TestValidator.predicate(
    "linked order item should belong to the authenticated customer",
    cancellationRequest.orderItem.order.customer.id === customer.id,
  );
}
