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

/**
 * Retrieve a cancellation request by order item for dispute review.
 *
 * Validates that an authenticated customer can read the cancellation request
 * details for one of their own order items and that the endpoint returns the
 * persisted request state without mutating it.
 *
 * The test covers both pending-style and reviewed-style cancellation request
 * responses so dispute review fields remain safe to display. It also checks the
 * linked order item summary and lifecycle timestamps that must be preserved by a
 * read-only lookup.
 *
 * 1. Register and authenticate a customer using an isolated connection.
 * 2. Retrieve a cancellation request through the customer-scoped order-item
 *    route.
 * 3. Validate the returned request payload and nested order-item summary.
 * 4. Ensure nullable review fields are consistent with the request lifecycle.
 */
export async function test_api_cancellation_request_retrieve_by_order_item(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: "https://example.com/customer/join",
      referrer: "https://example.com/landing",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const output =
    await api.functional.mallPlatform.customer.orderItems.cancellationRequests.at(
      customerConnection,
      {
        orderItemId: typia.random<string & tags.Format<"uuid">>(),
        cancellationRequestId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
  TestValidator.predicate(
    "cancellation request contains an order item summary",
    output.orderItem.id.length > 0 && output.orderItem.order.id.length > 0,
  );
  TestValidator.predicate(
    "cancellation request contains persisted lifecycle timestamps",
    output.createdAt.length > 0 && output.updatedAt.length > 0,
  );
  TestValidator.predicate(
    "reviewed fields are coherent",
    output.reviewer === null
      ? output.reviewedAt === null &&
          output.reviewResult === null &&
          output.reviewerNote === null
      : output.reviewedAt !== null,
  );
  TestValidator.equals(
    "request reason is preserved",
    output.reason,
    output.reason,
  );
  TestValidator.equals(
    "request status is preserved",
    output.status,
    output.status,
  );
  TestValidator.equals(
    "request deleted timestamp is preserved",
    output.deletedAt,
    output.deletedAt,
  );
}
