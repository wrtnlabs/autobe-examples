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

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_mall_platform_customer_order_items_refund_requests_create } from "../../../generate/generate_random_mall_platform_customer_order_items_refund_requests_create";
import { prepare_random_mall_platform_refund_request } from "../../../prepare/prepare_random_mall_platform_refund_request";

export async function test_api_refund_request_creation_duplicate_active_request_rejected(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Validate that a customer cannot create two active refund requests for the same delivered order item.
   *
   * This scenario verifies the item-level refund workflow business rule that only one active refund request
   * may exist per delivered order item at a time. It first creates a valid refund request, then attempts to
   * submit another request for the same item and expects the duplicate submission to fail. The test also
   * ensures the first refund request remains intact so the existing workflow state is preserved.
   *
   * 1. Register and authenticate a customer using an isolated connection.
   * 2. Create a refund request for a delivered order item.
   * 3. Attempt to create a second active refund request for the same order item.
   * 4. Verify the duplicate submission is rejected and the original request remains unchanged.
   */
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized: IMallPlatformCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "1234Abcd!",
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies IMallPlatformCustomer.IJoin,
    });
  typia.assert(authorized);
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const firstReason = RandomGenerator.paragraph({ sentences: 2 });
  const firstRequest =
    await generate_random_mall_platform_customer_order_items_refund_requests_create(
      customerConnection,
      {
        params: { orderItemId },
        body: {
          reason: firstReason,
        } satisfies IMallPlatformRefundRequest.ICreate,
      },
    );
  typia.assert(firstRequest);
  TestValidator.equals(
    "first refund request should target the requested order item",
    firstRequest.orderItem.id,
    orderItemId,
  );
  TestValidator.equals(
    "first refund request should preserve the submitted reason",
    firstRequest.reason,
    firstReason,
  );
  const duplicateReason = RandomGenerator.paragraph({ sentences: 3 });
  await TestValidator.error(
    "duplicate active refund request should be rejected",
    async () => {
      await generate_random_mall_platform_customer_order_items_refund_requests_create(
        customerConnection,
        {
          params: { orderItemId },
          body: {
            reason: duplicateReason,
          } satisfies IMallPlatformRefundRequest.ICreate,
        },
      );
    },
  );
  TestValidator.equals(
    "original refund request should remain unchanged after duplicate rejection",
    firstRequest.orderItem.id,
    orderItemId,
  );
  TestValidator.equals(
    "original refund request should preserve the submitted reason after duplicate rejection",
    firstRequest.reason,
    firstReason,
  );
}
