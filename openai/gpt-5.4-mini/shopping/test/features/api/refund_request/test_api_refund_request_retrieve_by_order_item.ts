import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
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
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_mall_platform_customer_order_items_refund_requests_create } from "../../../generate/generate_random_mall_platform_customer_order_items_refund_requests_create";
import { prepare_random_mall_platform_refund_request } from "../../../prepare/prepare_random_mall_platform_refund_request";

/**
 * Retrieve an administrator view of a refund request scoped to a specific order item.
 *
 * Validates that the administrator refund-request lookup returns the exact live refund request for the given order item without mutating state. The test covers actor isolation, customer-side refund-request creation, and read-only administrator inspection.
 *
 * The scenario ensures the returned payload preserves the order-item linkage, customer and seller ownership, request reason, workflow status, reviewer information when present, and lifecycle timestamps. It also confirms that lookup behavior does not alter the refund request record.
 *
 * 1. Administrator logs in using an isolated connection.
 * 2. Customer signs up using an isolated connection.
 * 3. Customer creates a refund request for a specific order item.
 * 4. Administrator retrieves the same refund request by order item and refund request identifiers.
 * 5. Validates the retrieved record matches the created request and preserves relational fields.
 */
export async function test_api_refund_request_retrieve_by_order_item(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_login(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(12),
    } satisfies IMallPlatformAdministrator.ILogin,
  });
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(12),
      href: "https://example.com/join",
      referrer: "https://example.com/landing",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const refundRequest =
    await generate_random_mall_platform_customer_order_items_refund_requests_create(
      customerConnection,
      {
        params: { orderItemId },
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IMallPlatformRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest);
  TestValidator.equals(
    "created refund request order item id",
    refundRequest.orderItem.id,
    orderItemId,
  );
  const retrieved =
    await api.functional.mallPlatform.administrator.orderItems.refundRequests.at(
      administratorConnection,
      {
        orderItemId,
        refundRequestId: refundRequest.id,
      },
    );
  typia.assert(retrieved);
  TestValidator.equals("refund request id", retrieved.id, refundRequest.id);
  TestValidator.equals(
    "refund request order item id",
    retrieved.orderItem.id,
    refundRequest.orderItem.id,
  );
  TestValidator.equals(
    "refund request reason",
    retrieved.reason,
    refundRequest.reason,
  );
  TestValidator.equals(
    "refund request status",
    retrieved.status,
    refundRequest.status,
  );
  TestValidator.equals(
    "refund request reviewed at",
    retrieved.reviewedAt,
    refundRequest.reviewedAt,
  );
  TestValidator.equals(
    "refund request review note",
    retrieved.reviewNote,
    refundRequest.reviewNote,
  );
  TestValidator.equals(
    "refund request created at",
    retrieved.createdAt,
    refundRequest.createdAt,
  );
  TestValidator.equals(
    "refund request updated at",
    retrieved.updatedAt,
    refundRequest.updatedAt,
  );
  TestValidator.equals(
    "refund request deleted at",
    retrieved.deletedAt,
    refundRequest.deletedAt,
  );
  TestValidator.equals(
    "refund request customer",
    retrieved.customer.id,
    refundRequest.customer.id,
  );
  TestValidator.equals(
    "refund request seller",
    retrieved.seller.id,
    refundRequest.seller.id,
  );
  TestValidator.equals(
    "refund request administrator",
    retrieved.administrator,
    refundRequest.administrator,
  );
}
